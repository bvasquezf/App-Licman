// =============================================================================
// scripts/importar-inventario.mjs
// =============================================================================
// Inyección inicial del inventario de equipos desde la planilla Excel hacia
// Supabase.
//
//   node scripts/importar-inventario.mjs            → PREVIEW (no escribe nada)
//   node scripts/importar-inventario.mjs --aplicar  → crea clientes faltantes
//                                                     e inserta los equipos
//
// Requisito: migración 010_import_inventario.sql aplicada en Supabase.
// Fuente: ~/Desktop/Planilla Inventario Licman COMPLETADA.xlsx,
//         hoja "Máquinas en Arriendo" (las otras hojas NO se importan; el
//         preview reporta su solapamiento).
// =============================================================================
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'

const APLICAR = process.argv.includes('--aplicar')
const XLS_PATH = '/Users/brian/Desktop/Planilla Inventario Licman COMPLETADA.xlsx'
const HOJA = 'Máquinas en Arriendo'

// ---------------------------------------------------------------- setup
const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

// ---------------------------------------------------------- normalización
const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const norm = s => sinTildes(String(s ?? '')).toLowerCase().replace(/\s+/g, ' ').trim()
const limpio = s => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t || null }
const titulo = s => {
  const t = limpio(s)
  if (!t) return t
  if (t !== t.toUpperCase()) return t // ya viene en caso mixto
  return t.toLowerCase().replace(/(^|\s)\p{L}/gu, c => c.toUpperCase())
}
const numONull = v => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const textoNum = v => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
  return limpio(v)
}

// ------------------------------------------------------------- lectura xlsx
const wb = XLSX.readFile(XLS_PATH)
const rows = XLSX.utils.sheet_to_json(wb.Sheets[HOJA], { header: 1, defval: '' })
// Índices (col 0 vacía): 1 Responsable, 2 Ubicación, 3 N° interno, 4 Tipo,
// 5 Marca, 6 Modelo, 7 Serie, 8 Cap, 9 Mástil, 10 Año, 11 Horometro,
// 12 Altura, 13 Elementos, 14 Estado, 15/16 Conteo, 17 Resultado,
// 18 Bateria, 19 Serie Bateria, 20 Observaciones
const data = rows.slice(1).filter(r =>
  [3, 4, 7].some(i => limpio(r[i])) // exige n° interno, tipo o serie
)

// ---------------------------------------------------------- clientes en BD
const { data: clientesDB, error: errCli } = await supabase
  .from('clientes').select('id, razon_social').order('id')
if (errCli) { console.error('Error leyendo clientes:', errCli.message); process.exit(1) }

const SUFIJOS = ['spa', 's a', 'sa', 'ltda', 'limitada', 'eirl', 'sociedad', 'anonima', 'chile']
const claveCliente = s => {
  let k = norm(s).replace(/&/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  for (const suf of SUFIJOS) k = k.replace(new RegExp(`\\b${suf}\\b`, 'g'), ' ')
  return k.replace(/\s+/g, ' ').trim()
}
const mapaClientes = new Map() // clave → cliente
for (const c of clientesDB) {
  const k = claveCliente(c.razon_social)
  if (!mapaClientes.has(k)) mapaClientes.set(k, c)
}
// Alias conocidos: clave según Excel → clave según BD
const ALIAS = {
  'tea group': 'tex group',
  bidfood: 'biofood',
  airolite: 'airlite',
  innovatek: 'innovatex',
  'los tres': 'lostres',
  novofama: 'novofarma',
  egakat: 'ega kat',
  comcait: 'comcaiit', // Comcait es con una sola i; en BD está COMCAIIT SA (Brian, 11-08-2026)
  'agricola san isidro': 'agricola agrobosques san isidro',
  'logistica industrial': 'loginsa cold frozen', // doble razón social de Loginsa
  'loginsa industrial': 'loginsa cold frozen',
  'logistica cold': 'loginsa cold frozen',
}
// Unificaciones dentro de la propia planilla (clientes nuevos): clave → clave
const UNIFICAR_NUEVOS = {
  'iglesia cat del e s': 'iglesia ces', // mismo cliente según Brian (11-08-2026)
}
// Ubicaciones propias que NO son clientes aunque no se llamen como la bodega:
// clave → { bodega } (la ubicación exacta queda en ubicacion_actual)
const UBICACIONES_PROPIAS = {
  'contenedor 1': 'Antillanca', // confirmado por Brian (11-08-2026)
}
function buscarCliente(ubicacion) {
  const k = claveCliente(ubicacion)
  if (mapaClientes.has(k)) return { cliente: mapaClientes.get(k), via: 'exacto' }
  const kAlias = ALIAS[k]
  if (kAlias && mapaClientes.has(kAlias)) return { cliente: mapaClientes.get(kAlias), via: 'alias' }
  const kk = kAlias ?? k
  if (kk.length >= 4) {
    let mejor = null
    for (const [ck, c] of mapaClientes) {
      if (ck.length >= 4 && (ck.includes(kk) || kk.includes(ck))) {
        if (!mejor || ck.length > mejor.ck.length) mejor = { ck, c }
      }
    }
    if (mejor) return { cliente: mejor.c, via: kAlias ? 'alias' : 'parecido' }
  }
  return null
}
// Unifica variantes del mismo cliente dentro de la propia planilla
// (ej. "DVP" / "dvp" / "DVP casablanca" → un solo cliente nuevo)
const clientesNuevos = new Map() // clave → { nombre, variantes: Set, count }
function registrarClienteNuevo(ubicacion) {
  const k = UNIFICAR_NUEVOS[claveCliente(ubicacion)] ?? claveCliente(ubicacion)
  let clave = k
  if (!clientesNuevos.has(clave)) {
    for (const ck of clientesNuevos.keys()) {
      if (ck.length >= 3 && k.length >= 3 && (ck.includes(k) || k.includes(ck))) { clave = ck; break }
    }
  }
  if (!clientesNuevos.has(clave)) clientesNuevos.set(clave, { nombre: ubicacion, variantes: new Set(), count: 0 })
  const entry = clientesNuevos.get(clave)
  entry.variantes.add(ubicacion)
  entry.count++
  // Preferir como nombre visible la variante en caso mixto (no TODO MAYÚSCULAS),
  // salvo siglas cortas tipo "DVP" que naturalmente van en mayúsculas
  if (entry.nombre.length > 4 && entry.nombre === entry.nombre.toUpperCase() && ubicacion !== ubicacion.toUpperCase()) entry.nombre = ubicacion
  return clave
}

// ------------------------------------------------------------ clasificación
const BODEGAS = { renca: 'Renca', cordillera: 'Cordillera' }
const esVenta = obs => {
  const o = norm(obs)
  if (o.includes('para venta') || o.includes('reemplazo por venta')) return false
  return o.includes('vendido') || o.includes('venta')
}
const fechaDeObs = obs => {
  const m = String(obs ?? '').match(/(\d{2})-(\d{2})-(\d{4})/)
  if (!m) return null
  const [, d, mo, y] = m
  if (+mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null
  return `${y}-${mo}-${d}T12:00:00Z`
}
function mapEstado(raw) {
  const e = sinTildes(String(raw ?? '')).toUpperCase().trim()
  if (e === 'OPERATIVA' || e === 'OPERATIVO') return { estado: 'Operativo' }
  if (e.startsWith('NO OPERATIV') || e === 'DESARME' || e.includes('REPARACION')) return { estado: 'Inoperativo' }
  if (e.includes('OPERATIV') || e.startsWith('PARCIALMENTE')) return { estado: 'Operativo con observaciones' }
  return { estado: 'Operativo', porDefecto: true } // vacío, NO INFO, etc.
}

// ------------------------------------------------------------- procesamiento
const { data: equiposDB } = await supabase.from('equipos').select('numero_interno, numero_serie')
const internosEnBD = new Set((equiposDB || []).map(e => limpio(e.numero_interno)).filter(Boolean))

const importables = []
const saltadas = []
const estadosPorDefecto = []
const matchesClientes = new Map() // ubicExcel → {via, db}
const vendidos = []
const vistosInterno = new Map() // clave → fila
const duplicados = []
const seriesRaras = []

for (const r of data) {
  const nInterno = textoNum(r[3])
  const serie = textoNum(r[7])
  const ubicRaw = limpio(r[2])
  const obs = limpio(r[20])
  const etiqueta = `N° ${nInterno ?? 's/n'} · ${limpio(r[4]) ?? '?'} ${limpio(r[6]) ?? ''} · serie ${serie ?? 's/s'}`

  // Dedup por n° interno (o serie si no hay interno)
  const claveDup = nInterno ?? `serie:${serie}`
  if (vistosInterno.has(claveDup)) {
    duplicados.push({ etiqueta, ubic: ubicRaw, primeraFila: vistosInterno.get(claveDup) })
    continue
  }
  if (nInterno && internosEnBD.has(nInterno)) {
    saltadas.push({ etiqueta, razon: 'ya existe en la app' })
    continue
  }

  // Ubicación → bodega o cliente
  const ubN = norm(ubicRaw)
  let bodega = null, cliente = null, ubicacion_actual = null, clienteClave = null
  if (!ubN || /^[?¿\s]*$/.test(ubN)) {
    saltadas.push({ etiqueta, razon: 'sin ubicación', estado: limpio(r[14]), obs })
    continue
  } else if (BODEGAS[ubN]) {
    bodega = BODEGAS[ubN]
  } else if (ubN.startsWith('antillanca')) {
    bodega = 'Antillanca'
    ubicacion_actual = ubicRaw
  } else if (UBICACIONES_PROPIAS[claveCliente(ubicRaw)]) {
    bodega = UBICACIONES_PROPIAS[claveCliente(ubicRaw)]
    ubicacion_actual = ubicRaw
  } else {
    const m = buscarCliente(ubicRaw)
    if (m) {
      cliente = m.cliente
      matchesClientes.set(ubicRaw, { via: m.via, db: m.cliente.razon_social })
    } else {
      clienteClave = registrarClienteNuevo(ubicRaw)
    }
    ubicacion_actual = ubicRaw
  }

  const { estado, porDefecto } = mapEstado(r[14])
  if (porDefecto) estadosPorDefecto.push({ etiqueta, estadoOriginal: limpio(r[14]) ?? '(vacío)', ubic: ubicRaw })

  const vendido = esVenta(obs)
  if (vendido) vendidos.push({ etiqueta, ubic: ubicRaw, fecha: fechaDeObs(obs) })

  if (serie && /[eE][+]/.test(serie)) seriesRaras.push({ etiqueta, serie })

  const marcaRaw = limpio(r[5])
  vistosInterno.set(claveDup, etiqueta)
  importables.push({
    payload: {
      bodega,
      cliente_id: cliente?.id ?? null,
      tipo_equipo: limpio(r[4]),
      numero_interno: nInterno,
      numero_serie: serie,
      marca: (marcaRaw === 'JN' || marcaRaw === 'JG') ? 'Jungheinrich' : marcaRaw,
      modelo: limpio(r[6]),
      ubicacion_actual,
      estado_operacional: estado,
      horometro: numONull(r[11]),
      elementos_faltantes: limpio(r[13])
        ? limpio(r[13]).split(',').map(s => titulo(s)).filter(Boolean)
        : [],
      observaciones: obs,
      responsable: titulo(r[1]) ?? 'Sin responsable',
      vendido,
      vendido_at: vendido ? fechaDeObs(obs) : null,
      capacidad_kg: numONull(r[8]),
      mastil: (v => !v || /^[-–—]+$/.test(v) || v === 'NO TIENE' ? null : titulo(v))(limpio(r[9])),
      anio: numONull(r[10]),
      altura: (v => !v || norm(v) === 'no visible' ? null : v)(textoNum(r[12])),
      bateria: limpio(r[18]),
      bateria_serie: textoNum(r[19]),
    },
    ubicRaw,
    clienteClave,
  })
}

// Solapamiento con otras hojas (solo informativo)
const internosMain = new Set(importables.map(i => i.payload.numero_interno).filter(Boolean))
const overlap = hoja => {
  const rs = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: '' })
  // La fila de encabezados puede no ser la primera (o no existir):
  // se busca en las primeras filas; si no hay, se asume el layout principal
  let headerIdx = rs.findIndex((r, i) => i < 6 && r.some(c => norm(c).includes('interno')))
  let idxInterno = 3, idxTipo = 4, idxModelo = 6, desde = 1
  if (headerIdx >= 0) {
    idxInterno = rs[headerIdx].findIndex(h => norm(h).includes('interno'))
    idxTipo = rs[headerIdx].findIndex(h => norm(h).startsWith('tipo'))
    idxModelo = rs[headerIdx].findIndex(h => norm(h) === 'modelo')
    desde = headerIdx + 1
  }
  const fuera = []
  let total = 0
  for (const r of rs.slice(desde)) {
    const n = textoNum(r[idxInterno])
    if (!n) continue
    total++
    if (!internosMain.has(n)) fuera.push(`N° ${n} ${limpio(r[idxTipo]) ?? ''} ${limpio(r[idxModelo]) ?? ''}`.trim())
  }
  return { total, dentro: total - fuera.length, fuera }
}
const ovVenta = wb.SheetNames.includes('Máquinas para Venta') ? overlap('Máquinas para Venta') : null
const ovNoStock = wb.SheetNames.includes('No Figuran en Stock') ? overlap('No Figuran en Stock') : null

// =================================================================== PREVIEW
const porBodega = {}
for (const i of importables) {
  const k = i.payload.bodega ?? (i.clienteClave ? 'Cliente (nuevo)' : 'Cliente (BD)')
  porBodega[k] = (porBodega[k] ?? 0) + 1
}
console.log(`\n================= ${APLICAR ? 'APLICANDO' : 'PREVIEW (sin escritura)'} =================`)
console.log(`Filas leídas: ${data.length} · importables: ${importables.length} · saltadas/duplicadas: ${saltadas.length + duplicados.length}`)
console.log('\n-- Distribución --')
for (const [k, v] of Object.entries(porBodega)) console.log(`  ${k}: ${v}`)

console.log(`\n-- Clientes encontrados en BD (${matchesClientes.size} ubicaciones) --`)
for (const [u, m] of [...matchesClientes].sort()) console.log(`  "${u}" → ${m.db}${m.via !== 'exacto' ? `  [${m.via}, REVISAR]` : ''}`)

console.log(`\n-- Clientes a CREAR (${clientesNuevos.size}) --`)
for (const e of [...clientesNuevos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
  const vars = [...e.variantes]
  console.log(`  "${e.nombre}" (${e.count} equipo${e.count > 1 ? 's' : ''})${vars.length > 1 ? ` · unifica: ${vars.join(' / ')}` : ''}`)
}

console.log(`\n-- Vendidos detectados (${vendidos.length}) --`)
for (const v of vendidos) console.log(`  ${v.etiqueta} · ${v.ubic} · ${v.fecha ?? 'sin fecha'}`)

console.log(`\n-- Saltadas: sin ubicación (${saltadas.filter(s => s.razon === 'sin ubicación').length}) --`)
for (const s of saltadas.filter(s => s.razon === 'sin ubicación')) console.log(`  ${s.etiqueta} · estado: ${s.estado ?? '-'} · obs: ${s.obs ?? '-'}`)
console.log(`-- Saltadas: ya en la app (${saltadas.filter(s => s.razon !== 'sin ubicación').length}) --`)
for (const s of saltadas.filter(s => s.razon !== 'sin ubicación')) console.log(`  ${s.etiqueta} · ${s.razon}`)

console.log(`\n-- Duplicados dentro del Excel (${duplicados.length}) --`)
for (const d of duplicados) console.log(`  ${d.etiqueta} · ${d.ubic} (se importa la 1ª: ${d.primeraFila})`)

console.log(`\n-- Estado asignado por defecto = Operativo (${estadosPorDefecto.length}) --`)
for (const e of estadosPorDefecto) console.log(`  ${e.etiqueta} · estado Excel: "${e.estadoOriginal}" · ${e.ubic}`)

if (seriesRaras.length) {
  console.log(`\n-- Series sospechosas (${seriesRaras.length}) --`)
  for (const s of seriesRaras) console.log(`  ${s.etiqueta} → "${s.serie}"`)
}
if (ovVenta) {
  console.log(`\n-- Hoja "Máquinas para Venta": ${ovVenta.dentro}/${ovVenta.total} ya están en la hoja principal (NO se importa) --`)
  if (ovVenta.fuera.length) {
    console.log(`  ${ovVenta.fuera.length} filas de esa hoja NO están en la principal (no importadas, revisar):`)
    for (const f of ovVenta.fuera) console.log(`    ${f}`)
  }
}
if (ovNoStock) {
  console.log(`-- Hoja "No Figuran en Stock": ${ovNoStock.dentro}/${ovNoStock.total} están en la hoja principal (NO se importa) --`)
  if (ovNoStock.fuera.length) {
    console.log(`  ${ovNoStock.fuera.length} equipos NUEVOS no importados (revisar con Brian):`)
    for (const f of ovNoStock.fuera) console.log(`    ${f}`)
  }
}

console.log('\n-- Notas (decisiones ya confirmadas por Brian) --')
console.log('  · "Contenedor 1" → ubicación propia dentro de Antillanca (no es cliente)')
console.log('  · "Iglesia Cat. Del E. S." + "Iglesia CES" → un solo cliente nuevo')
console.log('  · "Comcait" → COMCAIIT SA · "Agrícola San Isidro" → AGRICOLA AGROBOSQUES · los 3 "Loginsa/Logística" → LOGINSA COLD & FROZEN')
console.log('  · "DVP casablanca" se unifica dentro del cliente "DVP" — la ubicación exacta queda guardada en la ficha del equipo')
console.log('  · Equipo 2357 (Janssen) y 2352 (Cosmoplas, vendido) comparten serie 91095755 — la planilla los repite; se importan ambos, revisar')

console.log('\n-- Ejemplo de 2 filas mapeadas --')
for (const i of importables.slice(0, 2)) console.log(JSON.stringify(i.payload, null, 1))

if (!APLICAR) {
  console.log('\nPreview listo. Revisa las secciones [parecido/alias, REVISAR], los clientes a crear y las filas saltadas.')
  console.log('Cuando estés conforme y hayas aplicado la migración 010 en Supabase: node scripts/importar-inventario.mjs --aplicar')
  process.exit(0)
}

// =================================================================== APLICAR
const { error: errCol } = await supabase.from('equipos').select('capacidad_kg').limit(1)
if (errCol) {
  console.error('\n✗ La migración 010 no está aplicada (falta columna capacidad_kg). Aplícala primero en el SQL Editor de Supabase.')
  process.exit(1)
}

// 1) Crear clientes faltantes
const creados = new Map() // clave → id
for (const [clave, entry] of clientesNuevos) {
  const { data: c, error } = await supabase.from('clientes').insert({ razon_social: entry.nombre }).select('id, razon_social').single()
  if (error) { console.error(`✗ cliente "${entry.nombre}": ${error.message}`); continue }
  creados.set(clave, c.id)
  console.log(`+ cliente creado: ${entry.nombre} (id ${c.id})`)
}

// 2) Insertar equipos
let ok = 0
const errores = []
for (const [idx, item] of importables.entries()) {
  const p = { ...item.payload }
  if (item.clienteClave) p.cliente_id = creados.get(item.clienteClave) ?? null
  if (!p.bodega && !p.cliente_id) { errores.push({ n: p.numero_interno, msg: 'sin bodega ni cliente' }); continue }
  const { error } = await supabase.rpc('import_equipo', { p_equipo: p })
  if (error) errores.push({ n: p.numero_interno, msg: error.message })
  else ok++
  if ((idx + 1) % 50 === 0) console.log(`  ... ${idx + 1}/${importables.length}`)
}
console.log(`\n✓ Insertados: ${ok}/${importables.length}`)
if (errores.length) {
  console.log(`✗ Errores (${errores.length}):`)
  for (const e of errores) console.log(`  N° ${e.n}: ${e.msg}`)
}

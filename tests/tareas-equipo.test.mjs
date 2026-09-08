import test from "node:test";
import assert from "node:assert/strict";
import {
    equipoIdentificado,
    propiedadEquipoTarea,
    referenciaEquipoCliente,
    resumenEquipoTarea,
} from "../src/lib/tareasEquipo.js";

test("reconoce equipos Licman en tareas anteriores", () => {
    const tarea = {
        equipo_id: 42,
        equipo_referencia: "GH-042 · Toyota",
    };

    assert.equal(propiedadEquipoTarea(tarea).valor, "Licman");
    assert.equal(resumenEquipoTarea(tarea), "GH-042 · Toyota");
    assert.equal(equipoIdentificado(tarea), true);
});

test("construye una referencia clara para el equipo del cliente", () => {
    const tarea = {
        propiedad_equipo: "Cliente",
        equipo_cliente_tipo: "Grúa horquilla",
        equipo_cliente_marca: "Toyota",
        equipo_cliente_modelo: "8FG25",
        equipo_cliente_serie: "SER-1842",
    };

    assert.equal(
        referenciaEquipoCliente(tarea),
        "Grúa horquilla · Toyota 8FG25 · Serie SER-1842",
    );
    assert.equal(resumenEquipoTarea(tarea), referenciaEquipoCliente(tarea));
    assert.equal(equipoIdentificado(tarea), true);
});

test("mantiene pendiente una tarea cuyo equipo no está confirmado", () => {
    assert.equal(propiedadEquipoTarea({}).valor, "Por confirmar");
    assert.equal(propiedadEquipoTarea(null).valor, "Por confirmar");
    assert.equal(equipoIdentificado({ propiedad_equipo: "Por confirmar" }), false);
    assert.equal(equipoIdentificado({ propiedad_equipo: "Sin equipo" }), true);
});

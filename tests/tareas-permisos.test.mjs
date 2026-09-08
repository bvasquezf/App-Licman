import test from "node:test";
import assert from "node:assert/strict";
import {
    PERMISOS,
    rutaInicialParaPermisos,
} from "../src/lib/authPermissions.js";

test("un usuario sin una vista operativa no entra en un bucle de rutas", () => {
    assert.equal(rutaInicialParaPermisos([PERMISOS.TAREAS]), "/sin-acceso");
});

test("un técnico entra directamente a sus tareas", () => {
    assert.equal(
        rutaInicialParaPermisos([
            PERMISOS.TAREAS,
            PERMISOS.TAREAS_EJECUTAR_PROPIAS,
        ]),
        "/tareas/mis-tareas",
    );
});

test("un planificador entra a la agenda general", () => {
    assert.equal(
        rutaInicialParaPermisos([
            PERMISOS.TAREAS,
            PERMISOS.TAREAS_PLANIFICAR,
        ]),
        "/tareas",
    );
});

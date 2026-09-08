import test from "node:test";
import assert from "node:assert/strict";
import {
    PERMISOS,
    rutaInicialParaPermisos,
} from "../src/lib/authPermissions.js";

test("un usuario con acceso de lectura puede entrar a la agenda compartida", () => {
    assert.equal(rutaInicialParaPermisos([PERMISOS.TAREAS]), "/tareas");
});

test("un técnico entra primero a sus tareas y conserva el acceso compartido", () => {
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

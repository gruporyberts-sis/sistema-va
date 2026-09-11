
"use client";

import { useState } from "react";

export default function Page() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    telefono: "",
    correo: "",
    direccion: "",
  });

  const cambiar = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <main
      style={{
        maxWidth: "500px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial",
      }}
    >
      <h1>Registro de Persona</h1>
      <p>Proyecto de prueba móvil</p>

      <input
        name="nombre"
        placeholder="Nombre"
        value={form.nombre}
        onChange={cambiar}
        style={campo}
      />

      <input
        name="apellido"
        placeholder="Apellido"
        value={form.apellido}
        onChange={cambiar}
        style={campo}
      />

      <input
        name="cedula"
        placeholder="Cédula"
        value={form.cedula}
        onChange={cambiar}
        style={campo}
      />

      <input
        name="telefono"
        placeholder="Teléfono"
        value={form.telefono}
        onChange={cambiar}
        style={campo}
      />

      <input
        name="correo"
        type="email"
        placeholder="Correo electrónico"
        value={form.correo}
        onChange={cambiar}
        style={campo}
      />

      <textarea
        name="direccion"
        placeholder="Dirección"
        value={form.direccion}
        onChange={cambiar}
        style={campo}
      />

      <button
        type="button"
        style={{
          width: "100%",
          padding: "14px",
          marginTop: "10px",
          background: "#111827",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      >
        Guardar
      </button>
    </main>
  );
}

const campo = {
  width: "100%",
  padding: "12px",
  marginTop: "10px",
  boxSizing: "border-box" as const,
  border: "1px solid #ccc",
  borderRadius: "8px",
  fontSize: "16px",
};

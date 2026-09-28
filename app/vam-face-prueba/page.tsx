export default function VamFacePrueba() {
  const empleados = [
    {
      id: 1,
      nombre: "Juan Pérez",
      movimiento: "Entrada",
      hora: "8:00 a. m.",
      estado: "Correcto",
    },
    {
      id: 2,
      nombre: "María López",
      movimiento: "Salida",
      hora: "12:05 p. m.",
      estado: "Correcto",
    },
    {
      id: 3,
      nombre: "Carlos Rodríguez",
      movimiento: "Entrada",
      hora: "8:12 a. m.",
      estado: "Tardanza",
    },
  ];

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>VAM FACE Attendance</h1>

      <p>Prueba inicial del sistema de control de asistencia.</p>

      <div
        style={{
          marginTop: "30px",
          overflowX: "auto",
          border: "1px solid #ddd",
          borderRadius: "10px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={celda}>Empleado</th>
              <th style={celda}>Movimiento</th>
              <th style={celda}>Hora</th>
              <th style={celda}>Estado</th>
            </tr>
          </thead>

          <tbody>
            {empleados.map((empleado) => (
              <tr key={empleado.id}>
                <td style={celda}>{empleado.nombre}</td>
                <td style={celda}>{empleado.movimiento}</td>
                <td style={celda}>{empleado.hora}</td>
                <td style={celda}>{empleado.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: "25px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        VAM FACE Attendance · Prueba v0.1.0
      </p>
    </main>
  );
}

const celda = {
  padding: "14px",
  borderBottom: "1px solid #ddd",
  textAlign: "left" as const,
};
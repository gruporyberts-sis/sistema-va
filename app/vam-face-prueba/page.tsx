"use client";

import React, { FormEvent, useMemo, useState } from "react";

type Vista =
  | "inicio"
  | "marcacion"
  | "login"
  | "dashboard"
  | "empleados"
  | "nuevo-empleado"
  | "prueba-biometria";

type SesionEmpresa = {
  empresaId: string;
  empresaNombre: string;
  rol: string;
  usuario: string;
};

type Empleado = {
  id: string;
  codigo: string;
  nombre: string;
  cargo: string;
  departamento: string;
  estado: "ACTIVO" | "INACTIVO";
  biometria: boolean;
  documento?: string;
  telefono?: string;
  correo?: string;
  sucursal?: string;
  fechaIngreso?: string;
};

const EMPRESA_DEMO = {
  empresaId: "775e3316-087d-4e18-b76d-d698166c30c1",
  empresaNombre: "VAM FACE DEMO",
};

const EMPLEADOS_INICIALES: Empleado[] = [
  {
    id: "cc69bf15-356d-461f-b938-44a241482220",
    codigo: "EMP-001",
    nombre: "Juan Pérez",
    cargo: "Auxiliar Administrativo",
    departamento: "Administración",
    estado: "ACTIVO",
    biometria: false,
  },
];

export default function VamFacePrueba() {
  const [vista, setVista] = useState<Vista>("inicio");
  const [sesion, setSesion] = useState<SesionEmpresa | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>(EMPLEADOS_INICIALES);

  const abrirDashboard = () => {
    setVista("dashboard");
  };

  const cerrarSesion = () => {
    setSesion(null);
    setVista("inicio");
  };

  if (vista === "marcacion") {
    return <PantallaMarcacion volver={() => setVista("inicio")} />;
  }

  if (vista === "login") {
    return (
      <PantallaLogin
        volver={() => setVista("inicio")}
        accesoCorrecto={(usuario) => {
          setSesion({
            ...EMPRESA_DEMO,
            rol: "ADMIN_EMPRESA",
            usuario,
          });
          setVista("dashboard");
        }}
      />
    );
  }

  if (vista === "dashboard" && sesion) {
    return (
      <Dashboard
        sesion={sesion}
        abrirEmpleados={() => setVista("empleados")}
        abrirBiometria={() => setVista("prueba-biometria")}
        salir={cerrarSesion}
      />
    );
  }

  if (vista === "empleados" && sesion) {
    return (
      <PantallaEmpleados
        volver={abrirDashboard}
        empleados={empleados}
        nuevoEmpleado={() => setVista("nuevo-empleado")}
      />
    );
  }

  if (vista === "nuevo-empleado" && sesion) {
    return (
      <PantallaNuevoEmpleado
        cancelar={() => setVista("empleados")}
        guardar={(empleado) => {
          setEmpleados((actuales) => [...actuales, empleado]);
          setVista("empleados");
        }}
      />
    );
  }

  if (vista === "prueba-biometria" && sesion) {
    return <PantallaPruebaBiometria volver={abrirDashboard} />;
  }

  return (
    <Layout>
      <Cabecera subtitulo="Attendance" />

      <section style={{ marginTop: 38 }}>
        <div style={styles.etiqueta}>Bienvenido</div>

        <h1 style={styles.titulo}>
          Control de asistencia inteligente
        </h1>

        <p style={styles.descripcion}>
          Gestión de asistencia mediante reconocimiento facial,
          diseñada para empresas y equipos de trabajo.
        </p>
      </section>

      <button
        onClick={() => setVista("marcacion")}
        style={styles.tarjetaPrincipal}
      >
        <div style={styles.iconoPrincipal}>◎</div>

        <div style={styles.contenidoTarjeta}>
          <div style={styles.tarjetaTitulo}>
            Marcar asistencia
          </div>

          <div style={styles.tarjetaTexto}>
            Registrar entrada o salida mediante reconocimiento facial.
          </div>
        </div>

        <div style={styles.flecha}>›</div>
      </button>

      <button
        onClick={() => setVista("login")}
        style={styles.tarjetaSecundaria}
      >
        <div style={styles.iconoSecundario}>⚙</div>

        <div style={styles.contenidoTarjeta}>
          <div style={styles.tarjetaTitulo}>
            Administración
          </div>

          <div style={styles.tarjetaTexto}>
            Gestión de empleados, asistencia, horarios y reportes.
          </div>
        </div>

        <div style={styles.flecha}>›</div>
      </button>

      <EstadoSistema />

      <Pie />
    </Layout>
  );
}

/* =========================================================
   LOGIN PROVISIONAL
========================================================= */

function PantallaLogin({
  volver,
  accesoCorrecto,
}: {
  volver: () => void;
  accesoCorrecto: (usuario: string) => void;
}) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");

  const iniciarSesion = (e: FormEvent) => {
    e.preventDefault();

    setMensaje("");

    if (
      usuario.trim().toLowerCase() === "admin" &&
      clave === "VamFace2026"
    ) {
      accesoCorrecto("admin");
      return;
    }

    setMensaje("Usuario o contraseña incorrectos.");
  };

  return (
    <Layout>
      <button onClick={volver} style={styles.volver}>
        ← Volver
      </button>

      <div style={{ marginTop: 25 }}>
        <Cabecera subtitulo="Administración" />
      </div>

      <section style={{ marginTop: 38 }}>
        <div style={styles.etiqueta}>Acceso administrativo</div>

        <h1 style={styles.titulo}>
          Iniciar sesión
        </h1>

        <p style={styles.descripcion}>
          Ingresa tus credenciales para acceder a la administración
          de VAM FACE.
        </p>
      </section>

      <form
        onSubmit={iniciarSesion}
        style={styles.formulario}
      >
        <label style={styles.label}>
          Usuario
        </label>

        <input
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="Usuario"
          autoComplete="username"
          style={styles.input}
        />

        <label style={styles.label}>
          Contraseña
        </label>

        <input
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          style={styles.input}
        />

        {mensaje && (
          <div style={styles.error}>
            {mensaje}
          </div>
        )}

        <button
          type="submit"
          style={styles.botonPrincipal}
        >
          Entrar
        </button>
      </form>

      <div style={styles.avisoDev}>
        Acceso provisional de desarrollo
      </div>

      <Pie />
    </Layout>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  sesion,
  abrirEmpleados,
  abrirBiometria,
  salir,
}: {
  sesion: SesionEmpresa;
  abrirEmpleados: () => void;
  abrirBiometria: () => void;
  salir: () => void;
}) {
  return (
    <Layout>
      <Cabecera subtitulo="Administración" />

      <section style={{ marginTop: 34 }}>
        <div style={styles.etiqueta}>
          Panel administrativo
        </div>

        <h1 style={styles.tituloDashboard}>
          {sesion.empresaNombre}
        </h1>

        <p style={styles.descripcion}>
          Control general de asistencia de empleados.
        </p>
      </section>

      <section style={styles.usuarioCard}>
        <div>
          <div style={styles.textoPequeno}>
            Usuario
          </div>

          <div style={styles.usuarioValor}>
            {sesion.usuario}
          </div>
        </div>

        <div style={styles.rol}>
          Administrador
        </div>
      </section>

      <TituloSeccion texto="Resumen de hoy" />

      <section style={styles.gridResumen}>
        <Resumen valor="—" titulo="Presentes" />
        <Resumen valor="—" titulo="Tardanzas" />
        <Resumen valor="—" titulo="Ausentes" />
        <Resumen valor="—" titulo="Incidencias" />
      </section>

      <TituloSeccion texto="Administración" />

      <section style={styles.menuDashboard}>
        <OpcionMenu
          icono="👥"
          titulo="Empleados"
          texto="Personal, departamentos y biometría"
          onClick={abrirEmpleados}
        />

        <OpcionMenu
          icono="◎"
          titulo="Prueba biométrica"
          texto="Cámara, detección, enrolamiento y comparación facial"
          onClick={abrirBiometria}
        />

        <OpcionMenu
          icono="✓"
          titulo="Asistencia"
          texto="Marcaciones y control diario"
        />

        <OpcionMenu
          icono="◷"
          titulo="Horarios"
          texto="Jornadas y asignaciones"
        />

        <OpcionMenu
          icono="!"
          titulo="Incidencias"
          texto="Permisos, vacaciones y licencias"
        />

        <OpcionMenu
          icono="▤"
          titulo="Reportes"
          texto="Informes de asistencia"
        />

        <OpcionMenu
          icono="▣"
          titulo="Dispositivos"
          texto="Kioscos y equipos autorizados"
        />

        <OpcionMenu
          icono="⚙"
          titulo="Configuración"
          texto="Empresa, sucursales y parámetros"
        />
      </section>

      <button onClick={salir} style={styles.cerrarSesion}>
        Cerrar sesión
      </button>

      <Pie />
    </Layout>
  );
}

/* =========================================================
   EMPLEADOS
========================================================= */

function PantallaEmpleados({
  volver,
  empleados,
  nuevoEmpleado,
}: {
  volver: () => void;
  empleados: Empleado[];
  nuevoEmpleado: () => void;
}) {
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((empleado) => {
      const texto = buscar.toLowerCase().trim();

      const coincideBusqueda =
        !texto ||
        empleado.nombre.toLowerCase().includes(texto) ||
        empleado.codigo.toLowerCase().includes(texto) ||
        empleado.cargo.toLowerCase().includes(texto) ||
        empleado.departamento.toLowerCase().includes(texto);

      const coincideEstado =
        estado === "TODOS" ||
        empleado.estado === estado;

      return coincideBusqueda && coincideEstado;
    });
  }, [buscar, estado, empleados]);

  return (
    <Layout>
      <button onClick={volver} style={styles.volver}>
        ← Dashboard
      </button>

      <div style={{ marginTop: 20 }}>
        <Cabecera subtitulo="Empleados" />
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={styles.etiqueta}>
          Gestión de personal
        </div>

        <h1 style={styles.tituloDashboard}>
          Empleados
        </h1>

        <p style={styles.descripcion}>
          Administra el personal y su registro biométrico.
        </p>
      </section>

      <section style={styles.estadisticasEmpleados}>
        <Resumen
          valor={String(empleados.length)}
          titulo="Total"
        />

        <Resumen
          valor={String(
            empleados.filter(
              (e) => e.estado === "ACTIVO"
            ).length
          )}
          titulo="Activos"
        />

        <Resumen
          valor={String(
            empleados.filter(
              (e) => e.biometria
            ).length
          )}
          titulo="Con biometría"
        />
      </section>

      <button
        onClick={nuevoEmpleado}
        style={{
          ...styles.botonPrincipal,
          marginTop: 22,
        }}
      >
        + Nuevo empleado
      </button>

      <div style={styles.filtros}>
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar empleado..."
          style={styles.input}
        />

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          style={styles.select}
        >
          <option value="TODOS">
            Todos los estados
          </option>

          <option value="ACTIVO">
            Activos
          </option>

          <option value="INACTIVO">
            Inactivos
          </option>
        </select>
      </div>

      <div style={styles.resultados}>
        {empleadosFiltrados.length} empleado
        {empleadosFiltrados.length !== 1 ? "s" : ""}
      </div>

      <section style={styles.listaEmpleados}>
        {empleadosFiltrados.map((empleado) => (
          <EmpleadoCard
            key={empleado.id}
            empleado={empleado}
          />
        ))}

        {empleadosFiltrados.length === 0 && (
          <div style={styles.vacio}>
            No se encontraron empleados.
          </div>
        )}
      </section>

      <Pie />
    </Layout>
  );
}

function PantallaNuevoEmpleado({
  cancelar,
  guardar,
}: {
  cancelar: () => void;
  guardar: (empleado: Empleado) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [sucursal, setSucursal] = useState("Sucursal Principal");
  const [departamento, setDepartamento] = useState("Administración");
  const [cargo, setCargo] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO">("ACTIVO");
  const [error, setError] = useState("");

  const guardarEmpleado = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!codigo.trim() || !nombres.trim() || !apellidos.trim() || !cargo.trim() || !fechaIngreso) {
      setError("Completa los campos obligatorios: código, nombres, apellidos, cargo y fecha de ingreso.");
      return;
    }

    guardar({
      id: `dev-${Date.now()}`,
      codigo: codigo.trim().toUpperCase(),
      nombre: `${nombres.trim()} ${apellidos.trim()}`,
      cargo: cargo.trim(),
      departamento,
      estado,
      biometria: false,
      documento: documento.trim(),
      telefono: telefono.trim(),
      correo: correo.trim(),
      sucursal,
      fechaIngreso,
    });
  };

  return (
    <Layout>
      <button onClick={cancelar} style={styles.volver}>← Empleados</button>

      <div style={{ marginTop: 20 }}>
        <Cabecera subtitulo="Nuevo empleado" />
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={styles.etiqueta}>Gestión de personal</div>
        <h1 style={styles.tituloDashboard}>Nuevo empleado</h1>
        <p style={styles.descripcion}>
          Registra los datos personales y laborales del empleado.
        </p>
      </section>

      <form onSubmit={guardarEmpleado} style={styles.formulario}>
        <div style={styles.seccionFormulario}>Identificación</div>

        <label style={styles.label}>Código de empleado *</label>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ej. EMP-002" style={styles.input} />

        <label style={styles.label}>Nombres *</label>
        <input value={nombres} onChange={(e) => setNombres(e.target.value)}
          placeholder="Nombres" style={styles.input} />

        <label style={styles.label}>Apellidos *</label>
        <input value={apellidos} onChange={(e) => setApellidos(e.target.value)}
          placeholder="Apellidos" style={styles.input} />

        <label style={styles.label}>Cédula / Documento</label>
        <input value={documento} onChange={(e) => setDocumento(e.target.value)}
          placeholder="Documento de identidad" style={styles.input} />

        <div style={styles.seccionFormulario}>Contacto</div>

        <label style={styles.label}>Teléfono</label>
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)}
          placeholder="809-000-0000" style={styles.input} />

        <label style={styles.label}>Correo electrónico</label>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
          placeholder="empleado@empresa.com" style={styles.input} />

        <div style={styles.seccionFormulario}>Información laboral</div>

        <label style={styles.label}>Sucursal</label>
        <select value={sucursal} onChange={(e) => setSucursal(e.target.value)} style={styles.select}>
          <option>Sucursal Principal</option>
        </select>

        <label style={styles.label}>Departamento</label>
        <select value={departamento} onChange={(e) => setDepartamento(e.target.value)} style={styles.select}>
          <option>Administración</option>
        </select>

        <label style={styles.label}>Cargo *</label>
        <input value={cargo} onChange={(e) => setCargo(e.target.value)}
          placeholder="Cargo del empleado" style={styles.input} />

        <label style={styles.label}>Fecha de ingreso *</label>
        <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Estado</label>
        <select value={estado}
          onChange={(e) => setEstado(e.target.value as "ACTIVO" | "INACTIVO")}
          style={styles.select}>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>

        <div style={styles.seccionFormulario}>Reconocimiento facial</div>
        <div style={styles.biometriaNueva}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Biometría facial</div>
            <div style={styles.textoPequeno}>Se registrará después de crear el empleado.</div>
          </div>
          <span style={styles.biometriaPendiente}>Pendiente</span>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.botonPrincipal}>Guardar empleado</button>
        <button type="button" onClick={cancelar} style={styles.botonCancelar}>Cancelar</button>
      </form>

      <Pie />
    </Layout>
  );
}

function EmpleadoCard({
  empleado,
}: {
  empleado: Empleado;
}) {
  const iniciales = empleado.nombre
    .split(" ")
    .slice(0, 2)
    .map((nombre) => nombre[0])
    .join("")
    .toUpperCase();

  return (
    <button
      style={styles.empleadoCard}
      onClick={() => {}}
    >
      <div style={styles.avatar}>
        {iniciales}
      </div>

      <div style={styles.empleadoContenido}>
        <div style={styles.empleadoSuperior}>
          <div>
            <div style={styles.empleadoNombre}>
              {empleado.nombre}
            </div>

            <div style={styles.empleadoCodigo}>
              {empleado.codigo}
            </div>
          </div>

          <span style={styles.estadoActivo}>
            {empleado.estado}
          </span>
        </div>

        <div style={styles.empleadoCargo}>
          {empleado.cargo}
        </div>

        <div style={styles.empleadoDepartamento}>
          {empleado.departamento}
        </div>

        <div style={styles.linea} />

        <div style={styles.biometriaFila}>
          <span>Reconocimiento facial</span>

          <span
            style={
              empleado.biometria
                ? styles.biometriaOk
                : styles.biometriaPendiente
            }
          >
            {empleado.biometria
              ? "Registrado"
              : "Pendiente"}
          </span>
        </div>
      </div>

      <div style={styles.menuFlecha}>
        ›
      </div>
    </button>
  );
}


/* =========================================================
   PRUEBA BIOMÉTRICA FACIAL
   DEV: cámara + detección visual + enrolamiento/comparación
   local. No guarda imágenes ni envía biometría al servidor.
========================================================= */

function PantallaPruebaBiometria({
  volver,
}: {
  volver: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [camaraActiva, setCamaraActiva] = useState(false);
  const [estadoCamara, setEstadoCamara] = useState("Cámara detenida");
  const [rostroDetectado, setRostroDetectado] = useState(false);
  const [nombreEnrolado, setNombreEnrolado] = useState("");
  const [plantilla, setPlantilla] = useState<number[] | null>(null);
  const [resultado, setResultado] = useState("");
  const [similitud, setSimilitud] = useState<number | null>(null);
  const [procesando, setProcesando] = useState(false);

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const iniciarCamara = async () => {
    setResultado("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstadoCamara("Este navegador no permite acceso a la cámara.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
      setEstadoCamara("Cámara frontal activa");
    } catch (error) {
      setEstadoCamara(
        "No se pudo abrir la cámara. Verifica el permiso del navegador y usa HTTPS o localhost."
      );
    }
  };

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamaraActiva(false);
    setRostroDetectado(false);
    setEstadoCamara("Cámara detenida");
  };

  const capturarMuestra = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const size = 96;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // Espejo para coincidir con la vista frontal.
    ctx.save();
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, size, size);
    ctx.restore();

    const image = ctx.getImageData(0, 0, size, size);
    const data = image.data;

    // Plantilla visual DEV: bloques de luminancia normalizada.
    // Sirve para validar el flujo cámara → enrolamiento → comparación.
    // NO es todavía el embedding neuronal de producción.
    const grid = 12;
    const block = size / grid;
    const vector: number[] = [];

    let mediaGlobal = 0;
    let totalPixeles = 0;

    for (let gy = 0; gy < grid; gy++) {
      for (let gx = 0; gx < grid; gx++) {
        let suma = 0;
        let cantidad = 0;

        for (let y = Math.floor(gy * block); y < Math.floor((gy + 1) * block); y++) {
          for (let x = Math.floor(gx * block); x < Math.floor((gx + 1) * block); x++) {
            const i = (y * size + x) * 4;
            const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            suma += lum;
            mediaGlobal += lum;
            cantidad++;
            totalPixeles++;
          }
        }
        vector.push(cantidad ? suma / cantidad : 0);
      }
    }

    mediaGlobal = totalPixeles ? mediaGlobal / totalPixeles : 0;
    const centrado = vector.map((v) => v - mediaGlobal);
    const norma = Math.sqrt(centrado.reduce((acc, v) => acc + v * v, 0)) || 1;
    return centrado.map((v) => v / norma);
  };

  const detectarRostro = async () => {
    if (!camaraActiva) {
      setResultado("Primero activa la cámara.");
      return;
    }

    setProcesando(true);
    setResultado("");

    try {
      const Detector = (window as any).FaceDetector;
      if (Detector) {
        const detector = new Detector({ fastMode: true, maxDetectedFaces: 2 });
        const caras = await detector.detect(videoRef.current);
        const hayUna = caras.length === 1;
        setRostroDetectado(hayUna);
        setResultado(
          caras.length === 0
            ? "No se detectó un rostro. Acércate y mejora la iluminación."
            : caras.length > 1
            ? "Se detectó más de un rostro. Debe aparecer una sola persona."
            : "Rostro detectado correctamente."
        );
      } else {
        // Fallback DEV: confirma que hay imagen de cámara disponible.
        const muestra = capturarMuestra();
        const ok = !!muestra;
        setRostroDetectado(ok);
        setResultado(
          ok
            ? "Cámara e imagen facial disponibles. Este navegador no ofrece FaceDetector nativo; la detección neuronal se integrará en la fase Android."
            : "No se pudo obtener una imagen de la cámara."
        );
      }
    } catch {
      setRostroDetectado(false);
      setResultado("No fue posible ejecutar la detección facial en este navegador.");
    } finally {
      setProcesando(false);
    }
  };

  const enrolar = () => {
    if (!camaraActiva) {
      setResultado("Primero activa la cámara.");
      return;
    }
    if (!nombreEnrolado.trim()) {
      setResultado("Escribe el nombre de la persona antes de enrolar.");
      return;
    }

    const muestra = capturarMuestra();
    if (!muestra) {
      setResultado("No fue posible capturar la muestra.");
      return;
    }

    setPlantilla(muestra);
    setRostroDetectado(true);
    setSimilitud(null);
    setResultado(
      `Muestra de ${nombreEnrolado.trim()} enrolada localmente para esta prueba.`
    );
  };

  const comparar = () => {
    if (!plantilla) {
      setResultado("Primero enrola una persona.");
      return;
    }

    const muestra = capturarMuestra();
    if (!muestra) {
      setResultado("No fue posible capturar la muestra actual.");
      return;
    }

    let producto = 0;
    let normaA = 0;
    let normaB = 0;
    for (let i = 0; i < plantilla.length; i++) {
      producto += plantilla[i] * muestra[i];
      normaA += plantilla[i] * plantilla[i];
      normaB += muestra[i] * muestra[i];
    }
    const coseno = producto / ((Math.sqrt(normaA) * Math.sqrt(normaB)) || 1);
    const porcentaje = Math.max(0, Math.min(100, Math.round(((coseno + 1) / 2) * 100)));
    setSimilitud(porcentaje);

    // Umbral únicamente para esta prueba visual DEV.
    if (porcentaje >= 92) {
      setResultado(`Coincidencia DEV: ${nombreEnrolado.trim()}.`);
    } else {
      setResultado("La muestra actual no supera el umbral DEV de coincidencia.");
    }
  };

  const borrarPlantilla = () => {
    setPlantilla(null);
    setNombreEnrolado("");
    setSimilitud(null);
    setResultado("Muestra local eliminada.");
  };

  return (
    <Layout>
      <button onClick={() => { detenerCamara(); volver(); }} style={styles.volver}>
        ← Dashboard
      </button>

      <div style={{ marginTop: 20 }}>
        <Cabecera subtitulo="Prueba biométrica" />
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={styles.etiqueta}>Laboratorio DEV</div>
        <h1 style={styles.tituloDashboard}>Biometría facial</h1>
        <p style={styles.descripcion}>
          Prueba local del flujo de cámara, detección, enrolamiento y comparación.
        </p>
      </section>

      <section style={styles.camaraCard}>
        <div style={styles.videoMarco}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
              display: camaraActiva ? "block" : "none",
            }}
          />
          {!camaraActiva && (
            <div style={styles.camaraVacia}>◎</div>
          )}
          <div style={styles.guiaRostro} />
        </div>

        <div style={styles.estadoCamara}>{estadoCamara}</div>

        {!camaraActiva ? (
          <button onClick={iniciarCamara} style={styles.botonPrincipal}>
            Activar cámara frontal
          </button>
        ) : (
          <button onClick={detenerCamara} style={styles.botonCancelar}>
            Detener cámara
          </button>
        )}

        <button
          onClick={detectarRostro}
          disabled={!camaraActiva || procesando}
          style={{
            ...styles.botonSecundarioVerde,
            opacity: !camaraActiva || procesando ? 0.5 : 1,
          }}
        >
          {procesando ? "Analizando..." : "1. Detectar rostro"}
        </button>
      </section>

      <section style={styles.formulario}>
        <div style={styles.seccionFormulario}>Enrolamiento local</div>

        <label style={styles.label}>Nombre para la prueba</label>
        <input
          value={nombreEnrolado}
          onChange={(e) => setNombreEnrolado(e.target.value)}
          placeholder="Ej. Juan Pérez"
          style={styles.input}
        />

        <button
          type="button"
          onClick={enrolar}
          disabled={!camaraActiva}
          style={{
            ...styles.botonPrincipal,
            opacity: !camaraActiva ? 0.5 : 1,
          }}
        >
          2. Enrolar rostro
        </button>

        <button
          type="button"
          onClick={comparar}
          disabled={!camaraActiva || !plantilla}
          style={{
            ...styles.botonSecundarioVerde,
            opacity: !camaraActiva || !plantilla ? 0.5 : 1,
          }}
        >
          3. Comparar rostro actual
        </button>

        {plantilla && (
          <div style={styles.biometriaNueva}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Muestra local registrada
              </div>
              <div style={styles.textoPequeno}>
                {nombreEnrolado || "Persona de prueba"}
              </div>
            </div>
            <span style={styles.biometriaOk}>Lista</span>
          </div>
        )}

        {similitud !== null && (
          <div style={styles.resultadoBiometrico}>
            Similitud DEV: <strong>{similitud}%</strong>
          </div>
        )}

        {resultado && <div style={styles.mensajeInfo}>{resultado}</div>}

        {plantilla && (
          <button type="button" onClick={borrarPlantilla} style={styles.botonPeligroSuave}>
            Borrar muestra local
          </button>
        )}
      </section>

      <div style={styles.avisoDev}>
        Esta pantalla valida el flujo técnico en el navegador. La comparación actual
        usa una plantilla visual temporal, no un modelo biométrico de producción.
        No se guarda ninguna fotografía ni plantilla al recargar la página.
        Liveness y embeddings neuronales se implementarán en Android antes de usar
        VAM FACE para asistencia real.
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <Pie />
    </Layout>
  );
}

/* =========================================================
   MARCACIÓN
========================================================= */

function PantallaMarcacion({
  volver,
}: {
  volver: () => void;
}) {
  const [mensaje, setMensaje] = useState(
    "Kiosco Principal · En línea"
  );

  return (
    <Layout>
      <button onClick={volver} style={styles.volver}>
        ← Volver
      </button>

      <div style={{ marginTop: 22 }}>
        <Cabecera subtitulo="Marcación" />
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={styles.etiqueta}>
          Control de asistencia
        </div>

        <h1 style={styles.titulo}>
          Marcar asistencia
        </h1>

        <p style={styles.descripcion}>
          Colócate frente a la cámara para identificarte.
        </p>
      </section>

      <section style={styles.reconocimiento}>
        <div style={styles.circuloFacial}>
          ◎
        </div>

        <h2 style={{ marginTop: 24 }}>
          Listo para marcar
        </h2>

        <p style={styles.descripcion}>
          El sistema identificará automáticamente al empleado.
        </p>

        <button
          onClick={() =>
            setMensaje(
              "Reconocimiento facial pendiente de integrar."
            )
          }
          style={{
            ...styles.botonPrincipal,
            marginTop: 20,
          }}
        >
          Iniciar reconocimiento facial
        </button>

        <div style={styles.mensajeInfo}>
          {mensaje}
        </div>
      </section>

      <section style={styles.horarios}>
        <Horario valor="08:00" titulo="Entrada" />
        <Horario valor="10 min" titulo="Gracia" />
        <Horario valor="17:00" titulo="Salida" />
      </section>

      <Pie />
    </Layout>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main style={styles.main}>
      <div style={styles.contenedor}>
        {children}
      </div>
    </main>
  );
}

function Cabecera({
  subtitulo,
}: {
  subtitulo: string;
}) {
  return (
    <header style={styles.header}>
      <div style={styles.logoGrupo}>
        <div style={styles.logo}>◎</div>

        <div>
          <div style={styles.marca}>
            VAM FACE
          </div>

          <div style={styles.submarca}>
            {subtitulo}
          </div>
        </div>
      </div>

      <div style={styles.version}>
        v0.1.4 DEV
      </div>
    </header>
  );
}

function EstadoSistema() {
  return (
    <div style={styles.estadoSistema}>
      <span>●</span>
      Sistema disponible
    </div>
  );
}

function Pie() {
  return (
    <footer style={styles.footer}>
      <span>VAM FACE Attendance</span>
      <span>v0.1.4 DEV</span>
    </footer>
  );
}

function TituloSeccion({
  texto,
}: {
  texto: string;
}) {
  return (
    <div style={styles.tituloSeccion}>
      {texto}
    </div>
  );
}

function Resumen({
  valor,
  titulo,
}: {
  valor: string;
  titulo: string;
}) {
  return (
    <div style={styles.resumenCard}>
      <div style={styles.resumenValor}>
        {valor}
      </div>

      <div style={styles.textoPequeno}>
        {titulo}
      </div>
    </div>
  );
}

function OpcionMenu({
  icono,
  titulo,
  texto,
  onClick,
}: {
  icono: string;
  titulo: string;
  texto: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={styles.opcionMenu}
    >
      <div style={styles.menuIcono}>
        {icono}
      </div>

      <div style={{ flex: 1 }}>
        <div style={styles.menuTitulo}>
          {titulo}
        </div>

        <div style={styles.menuTexto}>
          {texto}
        </div>
      </div>

      <div style={styles.menuFlecha}>
        ›
      </div>
    </button>
  );
}

function Horario({
  valor,
  titulo,
}: {
  valor: string;
  titulo: string;
}) {
  return (
    <div style={styles.tarjetaHorario}>
      <div style={styles.horarioValor}>
        {valor}
      </div>

      <div style={styles.textoPequeno}>
        {titulo}
      </div>
    </div>
  );
}

/* =========================================================
   ESTILOS
========================================================= */

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#f4f7f9",
    fontFamily: "Arial, sans-serif",
    padding: 20,
    color: "#17202a",
  },

  contenedor: {
    width: "100%",
    maxWidth: 430,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  logoGrupo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    width: 54,
    height: 54,
    borderRadius: 17,
    background: "#0f766e",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 29,
    flexShrink: 0,
  },

  marca: {
    fontSize: 22,
    fontWeight: 700,
  },

  submarca: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  version: {
    fontSize: 10,
    background: "white",
    border: "1px solid #dce3e8",
    padding: "6px 9px",
    borderRadius: 20,
    whiteSpace: "nowrap",
  },

  etiqueta: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: 700,
  },

  titulo: {
    fontSize: 29,
    lineHeight: 1.15,
    margin: "8px 0 12px",
  },

  tituloDashboard: {
    fontSize: 27,
    lineHeight: 1.15,
    margin: "8px 0 10px",
  },

  descripcion: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 1.55,
    margin: 0,
  },

  tarjetaPrincipal: {
    width: "100%",
    marginTop: 34,
    padding: "22px 18px",
    border: "none",
    borderRadius: 20,
    background: "#0f766e",
    color: "white",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
  },

  tarjetaSecundaria: {
    width: "100%",
    marginTop: 14,
    padding: "22px 18px",
    border: "1px solid #dce3e8",
    borderRadius: 20,
    background: "white",
    color: "#17202a",
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
  },

  iconoPrincipal: {
    width: 52,
    height: 52,
    borderRadius: 15,
    background: "rgba(255,255,255,.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    flexShrink: 0,
  },

  iconoSecundario: {
    width: 52,
    height: 52,
    borderRadius: 15,
    background: "#ecfdf5",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    flexShrink: 0,
  },

  contenidoTarjeta: {
    flex: 1,
    marginLeft: 15,
  },

  tarjetaTitulo: {
    fontWeight: 700,
    fontSize: 17,
  },

  tarjetaTexto: {
    fontSize: 12,
    lineHeight: 1.45,
    marginTop: 5,
    opacity: 0.8,
  },

  flecha: {
    fontSize: 30,
    marginLeft: 8,
  },

  estadoSistema: {
    marginTop: 24,
    background: "#ecfdf5",
    color: "#047857",
    padding: 13,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: 600,
  },

  footer: {
    marginTop: 28,
    paddingBottom: 20,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    color: "#9ca3af",
    fontSize: 11,
  },

  volver: {
    border: "none",
    background: "transparent",
    color: "#0f766e",
    fontWeight: 700,
    fontSize: 14,
    padding: "10px 0",
    cursor: "pointer",
  },

  formulario: {
    marginTop: 30,
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 20,
    padding: 20,
  },

  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 7,
    marginTop: 13,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 48,
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "0 13px",
    fontSize: 14,
    background: "white",
    color: "#17202a",
    outline: "none",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 48,
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "0 13px",
    fontSize: 14,
    background: "white",
    color: "#17202a",
  },

  botonPrincipal: {
    width: "100%",
    minHeight: 52,
    border: "none",
    borderRadius: 13,
    background: "#0f766e",
    color: "white",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 22,
  },

  error: {
    marginTop: 15,
    background: "#fef2f2",
    color: "#b91c1c",
    padding: 12,
    borderRadius: 10,
    fontSize: 12,
  },

  avisoDev: {
    marginTop: 16,
    background: "#fff7ed",
    color: "#c2410c",
    borderRadius: 12,
    padding: 12,
    textAlign: "center",
    fontSize: 11,
  },

  usuarioCard: {
    marginTop: 24,
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 18,
    padding: 17,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  usuarioValor: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 4,
  },

  rol: {
    background: "#ecfdf5",
    color: "#047857",
    borderRadius: 20,
    padding: "7px 10px",
    fontSize: 11,
    fontWeight: 700,
  },

  tituloSeccion: {
    marginTop: 28,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: 700,
  },

  gridResumen: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
  },

  estadisticasEmpleados: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginTop: 22,
  },

  resumenCard: {
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 16,
    padding: 16,
  },

  resumenValor: {
    fontSize: 23,
    fontWeight: 700,
  },

  textoPequeno: {
    marginTop: 4,
    fontSize: 11,
    color: "#6b7280",
  },

  menuDashboard: {
    marginTop: 4,
    display: "grid",
    gap: 9,
  },

  opcionMenu: {
    width: "100%",
    border: "1px solid #e1e7eb",
    background: "white",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    color: "#17202a",
    cursor: "pointer",
  },

  menuIcono: {
    width: 43,
    height: 43,
    borderRadius: 12,
    background: "#ecfdf5",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 19,
    marginRight: 12,
    flexShrink: 0,
  },

  menuTitulo: {
    fontSize: 14,
    fontWeight: 700,
  },

  menuTexto: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 3,
  },

  menuFlecha: {
    fontSize: 24,
    color: "#9ca3af",
    marginLeft: 8,
  },

  cerrarSesion: {
    width: "100%",
    minHeight: 48,
    marginTop: 24,
    background: "transparent",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    borderRadius: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  filtros: {
    display: "grid",
    gap: 9,
    marginTop: 22,
  },

  resultados: {
    marginTop: 17,
    marginBottom: 10,
    color: "#6b7280",
    fontSize: 12,
  },

  listaEmpleados: {
    display: "grid",
    gap: 10,
  },

  empleadoCard: {
    width: "100%",
    border: "1px solid #e1e7eb",
    borderRadius: 18,
    background: "white",
    padding: 15,
    display: "flex",
    alignItems: "flex-start",
    textAlign: "left",
    color: "#17202a",
    cursor: "pointer",
  },

  avatar: {
    width: 47,
    height: 47,
    borderRadius: 14,
    background: "#ecfdf5",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    flexShrink: 0,
  },

  empleadoContenido: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  empleadoSuperior: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },

  empleadoNombre: {
    fontSize: 15,
    fontWeight: 700,
  },

  empleadoCodigo: {
    color: "#6b7280",
    fontSize: 10,
    marginTop: 3,
  },

  empleadoCargo: {
    fontSize: 12,
    marginTop: 10,
  },

  empleadoDepartamento: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 3,
  },

  estadoActivo: {
    background: "#ecfdf5",
    color: "#047857",
    padding: "4px 7px",
    borderRadius: 10,
    fontSize: 9,
    fontWeight: 700,
    height: "fit-content",
  },

  linea: {
    height: 1,
    background: "#eef2f4",
    margin: "12px 0",
  },

  biometriaFila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    fontSize: 10,
    color: "#6b7280",
  },

  biometriaOk: {
    color: "#047857",
    fontWeight: 700,
  },

  biometriaPendiente: {
    color: "#c2410c",
    fontWeight: 700,
  },

  vacio: {
    padding: 30,
    background: "white",
    borderRadius: 16,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 13,
  },

  mensajeInfo: {
    marginTop: 14,
    background: "#f0fdfa",
    color: "#0f766e",
    borderRadius: 11,
    padding: 12,
    fontSize: 11,
    lineHeight: 1.45,
  },

  reconocimiento: {
    marginTop: 28,
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 24,
    padding: "28px 20px",
    textAlign: "center",
  },

  circuloFacial: {
    width: 130,
    height: 130,
    margin: "0 auto",
    borderRadius: "50%",
    border: "3px dashed #0f766e",
    background: "#f0fdfa",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 55,
  },

  horarios: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginTop: 16,
  },

  tarjetaHorario: {
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 14,
    padding: "14px 5px",
    textAlign: "center",
  },

  horarioValor: {
    fontWeight: 700,
    fontSize: 17,
  },

  seccionFormulario: {
    marginTop: 24,
    marginBottom: 4,
    paddingBottom: 8,
    borderBottom: "1px solid #e5e7eb",
    color: "#0f766e",
    fontSize: 13,
    fontWeight: 700,
  },

  biometriaNueva: {
    marginTop: 12,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 12,
    padding: 13,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  botonCancelar: {
    width: "100%",
    minHeight: 48,
    marginTop: 10,
    background: "white",
    color: "#6b7280",
    border: "1px solid #d1d5db",
    borderRadius: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  camaraCard: {
    marginTop: 24,
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 20,
    padding: 16,
  },

  videoMarco: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 18,
    overflow: "hidden",
    background: "#111827",
    position: "relative",
  },

  camaraVacia: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    fontSize: 72,
  },

  guiaRostro: {
    position: "absolute",
    width: "54%",
    height: "70%",
    left: "23%",
    top: "15%",
    border: "2px dashed rgba(255,255,255,.8)",
    borderRadius: "48%",
    pointerEvents: "none",
  },

  estadoCamara: {
    marginTop: 12,
    textAlign: "center",
    color: "#6b7280",
    fontSize: 12,
  },

  botonSecundarioVerde: {
    width: "100%",
    minHeight: 48,
    marginTop: 10,
    background: "#ecfdf5",
    color: "#047857",
    border: "1px solid #a7f3d0",
    borderRadius: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  resultadoBiometrico: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    textAlign: "center",
    fontSize: 14,
  },

  botonPeligroSuave: {
    width: "100%",
    minHeight: 44,
    marginTop: 12,
    background: "#fff",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};
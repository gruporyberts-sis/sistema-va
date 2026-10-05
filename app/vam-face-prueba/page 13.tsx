"use client";
import { supabase } from "@/lib/supabase/client";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

type Vista =
  | "inicio"
  | "marcacion"
  | "login"
  | "activar-kiosco"
  | "dashboard"
  | "asistencia"
  | "horarios"
  | "incidencias"
  | "dispositivos"
  | "reportes"
  | "configuracion"
  | "kiosco"
  | "empleados"
  | "nuevo-empleado"
  | "detalle-empleado"
  | "editar-empleado"
  | "registro-biometria-empleado"
  | "verificar-biometria-empleado"
  | "reconocimiento-1n"
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
  nombres: string;
  apellidos: string;
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

export default function VamFacePrueba() {
  const [vista, setVista] = useState<Vista>("activar-kiosco");
  const [kioscoActivado, setKioscoActivado] = useState(false);
  const [sesion, setSesion] = useState<SesionEmpresa | null>(null);
  const [activandoInvitacion, setActivandoInvitacion] = useState(false);
  const [passwordInvitacion, setPasswordInvitacion] = useState("");
  const [confirmarPasswordInvitacion, setConfirmarPasswordInvitacion] = useState("");
  const [mensajeInvitacion, setMensajeInvitacion] = useState("");
  const [errorInvitacion, setErrorInvitacion] = useState("");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [errorEmpleados, setErrorEmpleados] = useState("");
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);

  const reconstruirSesion = React.useCallback(async () => {
    try {
      const activado =
        typeof window !== "undefined" &&
        window.localStorage.getItem("vam_face_kiosco_dev_activo") === "1";

      setKioscoActivado(activado);

      if (!activado) {
        // En una instalación nueva no reutilizamos una sesión administrativa anterior.
        await supabase.auth.signOut();
        setSesion(null);
        setVista("activar-kiosco");
        return;
      }

      const { data: { session: authSession }, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !authSession?.user) {
        // DEV local: si se perdió la sesión, exige reactivar.
        window.localStorage.removeItem("vam_face_kiosco_dev_activo");
        setKioscoActivado(false);
        setSesion(null);
        setVista("activar-kiosco");
        return;
      }

      const usuarioAuth = authSession.user;
      const { data: vinculaciones, error: vinculacionError } = await supabase
        .from("usuarios_empresa")
        .select("empresa_id,rol,estado")
        .eq("auth_user_id", usuarioAuth.id)
        .eq("estado", "ACTIVO")
        .limit(1);

      const vinculacion = vinculaciones?.[0];
      if (vinculacionError || !vinculacion || vinculacion.rol !== "ADMIN_EMPRESA") {
        window.localStorage.removeItem("vam_face_kiosco_dev_activo");
        await supabase.auth.signOut();
        setSesion(null);
        setVista("activar-kiosco");
        return;
      }

      const { data: empresas, error: empresaError } = await supabase
        .from("empresas")
        .select("id,nombre,estado")
        .eq("id", vinculacion.empresa_id)
        .eq("estado", "ACTIVA")
        .limit(1);

      if (empresaError || !empresas?.[0]) {
        window.localStorage.removeItem("vam_face_kiosco_dev_activo");
        await supabase.auth.signOut();
        setSesion(null);
        setVista("activar-kiosco");
        return;
      }

      setSesion({
        empresaId: empresas[0].id,
        empresaNombre: empresas[0].nombre,
        rol: vinculacion.rol,
        usuario: usuarioAuth.email || "",
      });
      setVista("kiosco");
    } finally {
      setVerificandoSesion(false);
    }
  }, []);

  React.useEffect(() => {
    reconstruirSesion();
  }, [reconstruirSesion]);

  const cargarEmpleados = React.useCallback(async () => {
    if (!sesion) return;

    setCargandoEmpleados(true);
    setErrorEmpleados("");

    const { data, error } = await supabase
      .from("empleados")
      .select(`
        id,
        codigo_empleado,
        nombres,
        apellidos,
        documento_identidad,
        email,
        telefono,
        cargo,
        fecha_ingreso,
        estado,
        biometria_registrada,
        sucursales!empleados_sucursal_id_fkey(nombre),
        departamentos!empleados_departamento_id_fkey(nombre)
        `)
      .eq("empresa_id", sesion.empresaId)
      .order("codigo_empleado");

    if (error) {
      console.error("VAM FACE EMPLEADOS ERROR:", error);
      setErrorEmpleados(`No fue posible cargar los empleados: ${error.message}`);
      setEmpleados([]);
      setCargandoEmpleados(false);
      return;
    }

    const normalizados: Empleado[] = (data || []).map((fila: any) => ({
      id: fila.id,
      codigo: fila.codigo_empleado,
      nombre: `${fila.nombres || ""} ${fila.apellidos || ""}`.trim(),
      nombres: fila.nombres || "",
      apellidos: fila.apellidos || "",
      cargo: fila.cargo || "",
      departamento: fila.departamentos?.nombre || "Sin departamento",
      estado: fila.estado === "INACTIVO" ? "INACTIVO" : "ACTIVO",
      biometria: Boolean(fila.biometria_registrada),
      documento: fila.documento_identidad || "",
      telefono: fila.telefono || "",
      correo: fila.email || "",
      sucursal: fila.sucursales?.nombre || "Sin sucursal",
      fechaIngreso: fila.fecha_ingreso || "",
    }));

    setEmpleados(normalizados);
    setCargandoEmpleados(false);
  }, [sesion]);

  React.useEffect(() => {
    if (sesion) cargarEmpleados();
  }, [sesion, cargarEmpleados]);

  const abrirDashboard = () => {
    setVista("dashboard");
  };

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hash.get("type") !== "invite") return;

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    setActivandoInvitacion(true);

    if (!accessToken || !refreshToken) {
      setErrorInvitacion("La invitación no contiene una sesión válida.");
      return;
    }

    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(({ error }) => {
      if (error) setErrorInvitacion(error.message);
      else window.history.replaceState({}, document.title, window.location.pathname);
    });
  }, []);

  const activarCuentaInvitada = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInvitacion("");
    setMensajeInvitacion("");

    if (passwordInvitacion.length < 8) {
      setErrorInvitacion("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (passwordInvitacion !== confirmarPasswordInvitacion) {
      setErrorInvitacion("Las contraseñas no coinciden.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordInvitacion });
    if (error) {
      setErrorInvitacion(error.message);
      return;
    }

    setMensajeInvitacion("Cuenta activada correctamente.");
    setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = "/vam-face-prueba";
    }, 800);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSesion(null);
    setVista("kiosco");
  };

  if (activandoInvitacion) {
    return (
      <Layout>
        <Cabecera subtitulo="Activación de cuenta" />
        <section style={{ marginTop: 28 }}>
          <div style={styles.etiqueta}>VAM FACE Attendance</div>
          <h1 style={styles.tituloDashboard}>Crear contraseña</h1>
          <p style={styles.descripcion}>Define la contraseña que utilizarás para iniciar sesión en VAM FACE.</p>
          {errorInvitacion && <div style={{padding:14,borderRadius:14,marginTop:14,background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"}}>{errorInvitacion}</div>}
          {mensajeInvitacion && <div style={{padding:14,borderRadius:14,marginTop:14,background:"#ecfdf5",border:"1px solid #a7f3d0",color:"#047857"}}>{mensajeInvitacion}</div>}
          <form onSubmit={activarCuentaInvitada} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:18,marginTop:18}}>
            <label style={{display:"block",fontSize:12,fontWeight:700}}>Nueva contraseña
              <input type="password" value={passwordInvitacion} onChange={e=>setPasswordInvitacion(e.target.value)} minLength={8} required style={{width:"100%",boxSizing:"border-box",padding:"12px",borderRadius:12,border:"1px solid #cbd5e1",marginTop:6}} />
            </label>
            <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Confirmar contraseña
              <input type="password" value={confirmarPasswordInvitacion} onChange={e=>setConfirmarPasswordInvitacion(e.target.value)} minLength={8} required style={{width:"100%",boxSizing:"border-box",padding:"12px",borderRadius:12,border:"1px solid #cbd5e1",marginTop:6}} />
            </label>
            <button type="submit" style={{marginTop:16,border:0,borderRadius:12,padding:"12px 16px",background:"#0f766e",color:"#fff",fontWeight:800}}>Activar mi cuenta</button>
          </form>
        </section>
        <Pie />
      </Layout>
    );
  }

  if (verificandoSesion) {
    return (
      <Layout>
        <Cabecera subtitulo="Attendance" />
        <div style={styles.mensajeInfo}>Verificando sesión...</div>
        <Pie />
      </Layout>
    );
  }

  if (vista === "marcacion") {
    return <PantallaMarcacion volver={() => setVista("inicio")} />;
  }

  if (vista === "activar-kiosco") {
    return (
      <PantallaLogin
        volver={() => setVista("activar-kiosco")}
        titulo="Activar Kiosco"
        descripcion="Inicia sesión con un usuario ADMIN_EMPRESA para autorizar este equipo como punto de marcación."
        textoBoton="ACTIVAR KIOSCO"
        soloAdministrador
        accesoCorrecto={async (sesionReal) => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("vam_face_kiosco_dev_activo", "1");
          }
          setKioscoActivado(true);
          setSesion(sesionReal);
          setVista("kiosco");
        }}
      />
    );
  }

  if (vista === "login") {
    return (
      <PantallaLogin
        volver={() => setVista("inicio")}
        titulo="Administración VAM FACE"
        descripcion="Acceso exclusivo para ADMIN_EMPRESA. Ingresa tus credenciales para salir del modo Kiosco."
        textoBoton="ENTRAR A ADMINISTRACIÓN"
        soloAdministrador
        accesoCorrecto={(sesionReal) => {
          setSesion(sesionReal);
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
        abrirReconocimiento={() => setVista("reconocimiento-1n")}
        abrirAsistencia={() => setVista("asistencia")}
        abrirHorarios={() => setVista("horarios")}
        abrirIncidencias={() => setVista("incidencias")}
        abrirDispositivos={() => setVista("dispositivos")}
        abrirReportes={() => setVista("reportes")}
        abrirConfiguracion={() => setVista("configuracion")}
        abrirKiosco={() => setVista("kiosco")}
        salir={cerrarSesion}
      />
    );
  }

  if (vista === "reconocimiento-1n" && sesion) {
    return <PantallaReconocimiento1N sesion={sesion} volver={abrirDashboard} />;
  }

  if (vista === "asistencia" && sesion) {
    return <PantallaAsistencia sesion={sesion} volver={abrirDashboard} />;
  }

  if (vista === "horarios" && sesion) {
    return <PantallaHorarios sesion={sesion} volver={abrirDashboard} />;
  }

  if (vista === "incidencias" && sesion) {
    return <PantallaIncidencias sesion={sesion} volver={abrirDashboard} />;
  }

  if (vista === "dispositivos" && sesion) {
    return <PantallaDispositivos sesion={sesion} volver={abrirDashboard} />;
  }

  if (vista === "reportes" && sesion) {
    return <PantallaReportes sesion={sesion} volver={abrirDashboard} />;
  }

  if (vista === "configuracion" && sesion) {
    return <PantallaConfiguracion sesion={sesion} volver={abrirDashboard} />;
  }
  if (vista === "kiosco" && sesion) {
    return <PantallaKiosco
      sesion={sesion}
      volver={abrirDashboard}
      abrirAdministracion={async () => {
        await supabase.auth.signOut();
        setSesion(null);
        setVista("login");
      }}
    />;
  }


  if (vista === "empleados" && sesion) {
    return (
      <PantallaEmpleados
        volver={abrirDashboard}
        empleados={empleados}
        cargando={cargandoEmpleados}
        errorCarga={errorEmpleados}
        nuevoEmpleado={() => setVista("nuevo-empleado")}
        verEmpleado={(empleado) => {
          setEmpleadoSeleccionado(empleado);
          setVista("detalle-empleado");
        }}
      />
    );
  }

  if (vista === "detalle-empleado" && sesion && empleadoSeleccionado) {
    return (
      <PantallaDetalleEmpleado
        empleado={empleadoSeleccionado}
        volver={() => setVista("empleados")}
        editar={() => setVista("editar-empleado")}
        registrarBiometria={() => setVista("registro-biometria-empleado")}
        verificarBiometria={() => setVista("verificar-biometria-empleado")}
      />
    );
  }

  if (vista === "registro-biometria-empleado" && sesion && empleadoSeleccionado) {
    return (
      <PantallaRegistroBiometriaEmpleado
        sesion={sesion}
        empleado={empleadoSeleccionado}
        cancelar={() => setVista("detalle-empleado")}
        registrado={async () => {
          const actualizado = { ...empleadoSeleccionado, biometria: true };
          setEmpleadoSeleccionado(actualizado);
          await cargarEmpleados();
          setVista("detalle-empleado");
        }}
      />
    );
  }

  if (vista === "verificar-biometria-empleado" && sesion && empleadoSeleccionado) {
    return (
      <PantallaVerificarBiometriaEmpleado
        sesion={sesion}
        empleado={empleadoSeleccionado}
        volver={() => setVista("detalle-empleado")}
      />
    );
  }

  if (vista === "editar-empleado" && sesion && empleadoSeleccionado) {
    return (
      <PantallaEditarEmpleado
        sesion={sesion}
        empleado={empleadoSeleccionado}
        cancelar={() => setVista("detalle-empleado")}
        guardado={async (empleadoActualizado) => {
          setEmpleadoSeleccionado(empleadoActualizado);
          await cargarEmpleados();
          setVista("detalle-empleado");
        }}
      />
    );
  }

  if (vista === "nuevo-empleado" && sesion) {
    return (
      <PantallaNuevoEmpleado
        sesion={sesion}
        cancelar={() => setVista("empleados")}
        guardado={async () => {
          await cargarEmpleados();
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
  titulo = "Iniciar sesión",
  descripcion = "Ingresa con el correo electrónico y la contraseña registrados en VAM FACE.",
  textoBoton = "INICIAR SESIÓN",
  soloAdministrador = false,
}: {
  volver: () => void;
  accesoCorrecto: (sesion: SesionEmpresa) => void | Promise<void>;
  titulo?: string;
  descripcion?: string;
  textoBoton?: string;
  soloAdministrador?: boolean;
}) {
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);

  const iniciarSesion = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const email = usuario.trim().toLowerCase();

    if (!email || !clave) {
      setMensaje("Ingresa tu correo electrónico y contraseña.");
      return;
    }

    setProcesando(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password: clave,
        });

      if (authError || !authData.user) {
        setMensaje("Correo electrónico o contraseña incorrectos.");
        return;
      }

      const { data: vinculaciones, error: vinculacionError } = await supabase
        .from("usuarios_empresa")
        .select("empresa_id,rol,estado")
        .eq("auth_user_id", authData.user.id)
        .eq("estado", "ACTIVO")
        .limit(1);

      if (vinculacionError) {
        await supabase.auth.signOut();
        setMensaje(
          `No fue posible validar el acceso a la empresa: ${vinculacionError.message}`
        );
        return;
      }

      const vinculacion = vinculaciones?.[0];

      if (!vinculacion) {
        await supabase.auth.signOut();
        setMensaje("El usuario no tiene una empresa activa asignada.");
        return;
      }

      if (soloAdministrador && vinculacion.rol !== "ADMIN_EMPRESA") {
        await supabase.auth.signOut();
        setMensaje("Solo un ADMIN_EMPRESA puede activar este Kiosco.");
        return;
      }

      const { data: empresas, error: empresaError } = await supabase
        .from("empresas")
        .select("id,nombre,estado")
        .eq("id", vinculacion.empresa_id)
        .eq("estado", "ACTIVA")
        .limit(1);

      if (empresaError) {
        await supabase.auth.signOut();
        setMensaje(
          `No fue posible consultar la empresa: ${empresaError.message}`
        );
        return;
      }

      const empresa = empresas?.[0];

      if (!empresa) {
        await supabase.auth.signOut();
        setMensaje("La empresa asignada no está disponible o no está activa.");
        return;
      }

      accesoCorrecto({
        empresaId: empresa.id,
        empresaNombre: empresa.nombre,
        rol: vinculacion.rol,
        usuario: authData.user.email || email,
      });
    } catch (error) {
      console.error("VAM FACE LOGIN ERROR:", error);
      setMensaje("No fue posible iniciar sesión. Intenta nuevamente.");
    } finally {
      setProcesando(false);
    }
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

        <h1 style={styles.titulo}>{titulo}</h1>

        <p style={styles.descripcion}>{descripcion}</p>
      </section>

      <form
        onSubmit={iniciarSesion}
        style={styles.formulario}
      >
        <label style={styles.label}>
          Correo electrónico
        </label>

        <input
          type="email"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          placeholder="correo@empresa.com"
          autoComplete="username"
          style={styles.input}
          disabled={procesando}
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
          disabled={procesando}
        />

        {mensaje && (
          <div style={styles.error}>
            {mensaje}
          </div>
        )}

        <button
          type="submit"
          style={{
            ...styles.botonPrincipal,
            opacity: procesando ? 0.6 : 1,
          }}
          disabled={procesando}
        >
          {procesando ? "Validando..." : "Entrar"}
        </button>
      </form>

      <div style={styles.avisoDev}>
        Acceso protegido con Supabase Auth y permisos por empresa.
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
  abrirReconocimiento,
  abrirAsistencia,
  abrirHorarios,
  abrirIncidencias,
  abrirDispositivos,
  abrirReportes,
  abrirConfiguracion,
  abrirKiosco,
  salir,
}: {
  sesion: SesionEmpresa;
  abrirEmpleados: () => void;
  abrirBiometria: () => void;
  abrirReconocimiento: () => void;
  abrirAsistencia: () => void;
  abrirHorarios: () => void;
  abrirIncidencias: () => void;
  abrirDispositivos: () => void;
  abrirReportes: () => void;
  abrirConfiguracion: () => void;
  abrirKiosco: () => void;
  salir: () => void;
}) {
  const [cargandoDashboard, setCargandoDashboard] = useState(true);
  const [errorDashboard, setErrorDashboard] = useState("");
  const [resumenHoy, setResumenHoy] = useState({
    empleados: 0,
    presentes: 0,
    tardanzas: 0,
    ausentes: 0,
    incidencias: 0,
  });
  const [marcacionesRecientes, setMarcacionesRecientes] = useState<Array<{
    id: string;
    empleado: string;
    codigo: string;
    tipo: string;
    fechaHora: string;
    confianza: number | null;
  }>>([]);

  const cargarDashboard = async () => {
    setCargandoDashboard(true);
    setErrorDashboard("");

    try {
      const ahora = new Date();
      const inicio = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0, 0, 0, 0
      );
      const fin = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + 1,
        0, 0, 0, 0
      );

      const yyyy = ahora.getFullYear();
      const mm = String(ahora.getMonth() + 1).padStart(2, "0");
      const dd = String(ahora.getDate()).padStart(2, "0");
      const fechaLocal = `${yyyy}-${mm}-${dd}`;

      const [
        empleadosResp,
        marcacionesHoyResp,
        asistenciaResp,
        recientesResp,
      ] = await Promise.all([
        supabase
          .from("empleados")
          .select("id,codigo_empleado,nombres,apellidos", { count: "exact" })
          .eq("empresa_id", sesion.empresaId)
          .eq("estado", "ACTIVO"),

        supabase
          .from("marcaciones")
          .select("empleado_id")
          .eq("empresa_id", sesion.empresaId)
          .gte("fecha_hora", inicio.toISOString())
          .lt("fecha_hora", fin.toISOString()),

        supabase
          .from("asistencia_diaria")
          .select("estado")
          .eq("empresa_id", sesion.empresaId)
          .eq("fecha", fechaLocal),

        supabase
          .from("marcaciones")
          .select("id,empleado_id,tipo,fecha_hora,confianza")
          .eq("empresa_id", sesion.empresaId)
          .order("fecha_hora", { ascending: false })
          .limit(8),
      ]);

      const errores = [
        empleadosResp.error,
        marcacionesHoyResp.error,
        asistenciaResp.error,
        recientesResp.error,
      ].filter(Boolean);

      if (errores.length) {
        throw errores[0];
      }

      const empleados = empleadosResp.data || [];
      const nombres = new Map(
        empleados.map((e: any) => [
          e.id,
          {
            nombre: `${e.nombres || ""} ${e.apellidos || ""}`.trim(),
            codigo: e.codigo_empleado || "",
          },
        ])
      );

      // Si una marcación reciente pertenece a un empleado que no vino en
      // la lista activa, lo buscamos para conservar correctamente el historial.
      const recientes = recientesResp.data || [];
      const idsFaltantes = Array.from(
        new Set(
          recientes
            .map((m: any) => m.empleado_id)
            .filter((id: string) => id && !nombres.has(id))
        )
      );

      if (idsFaltantes.length) {
        const { data: empleadosFaltantes, error } = await supabase
          .from("empleados")
          .select("id,codigo_empleado,nombres,apellidos")
          .eq("empresa_id", sesion.empresaId)
          .in("id", idsFaltantes);

        if (error) throw error;

        (empleadosFaltantes || []).forEach((e: any) => {
          nombres.set(e.id, {
            nombre: `${e.nombres || ""} ${e.apellidos || ""}`.trim(),
            codigo: e.codigo_empleado || "",
          });
        });
      }

      const presentes = new Set(
        (marcacionesHoyResp.data || []).map((m: any) => m.empleado_id)
      ).size;

      const estados = (asistenciaResp.data || []).map(
        (a: any) => String(a.estado || "").toUpperCase()
      );

      const estadosIncidencia = new Set([
        "VACACIONES",
        "PERMISO",
        "LICENCIA",
        "SUSPENSION",
        "INCAPACIDAD",
      ]);

      setResumenHoy({
        empleados: empleadosResp.count ?? empleados.length,
        presentes,
        tardanzas: estados.filter((e: string) => e === "TARDANZA").length,
        ausentes: estados.filter((e: string) => e === "AUSENTE").length,
        incidencias: estados.filter((e: string) => estadosIncidencia.has(e)).length,
      });

      setMarcacionesRecientes(
        recientes.map((m: any) => {
          const emp = nombres.get(m.empleado_id) || {
            nombre: "Empleado",
            codigo: "",
          };
          return {
            id: m.id,
            empleado: emp.nombre,
            codigo: emp.codigo,
            tipo: m.tipo,
            fechaHora: m.fecha_hora,
            confianza:
              m.confianza === null || m.confianza === undefined
                ? null
                : Number(m.confianza),
          };
        })
      );
    } catch (error: any) {
      console.error("VAM FACE DASHBOARD ERROR:", error);
      setErrorDashboard(
        error?.message || "No fue posible cargar el resumen de asistencia."
      );
    } finally {
      setCargandoDashboard(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, [sesion.empresaId]);

  const horaRD = (valor: string) =>
    new Intl.DateTimeFormat("es-DO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(valor));

  return (
    <Layout>
      <Cabecera subtitulo="Administración" />

      <section style={{ marginTop: 34 }}>
        <div style={styles.etiqueta}>Panel administrativo</div>

        <h1 style={styles.tituloDashboard}>{sesion.empresaNombre}</h1>

        <p style={styles.descripcion}>
          Control general de asistencia de empleados.
        </p>
      </section>

      <section style={styles.usuarioCard}>
        <div>
          <div style={styles.textoPequeno}>Usuario</div>
          <div style={styles.usuarioValor}>{sesion.usuario}</div>
        </div>
        <div style={styles.rol}>Administrador</div>
      </section>

      <TituloSeccion texto="Resumen de hoy" />

      {errorDashboard && (
        <div style={{
          padding: 14,
          borderRadius: 16,
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          color: "#9a3412",
          marginBottom: 14,
        }}>
          {errorDashboard}
        </div>
      )}

      <section style={styles.gridResumen}>
        <Resumen valor={cargandoDashboard ? "…" : String(resumenHoy.empleados)} titulo="Empleados activos" />
        <Resumen valor={cargandoDashboard ? "…" : String(resumenHoy.presentes)} titulo="Presentes hoy" />
        <Resumen valor={cargandoDashboard ? "…" : String(resumenHoy.tardanzas)} titulo="Tardanzas" />
        <Resumen valor={cargandoDashboard ? "…" : String(resumenHoy.ausentes)} titulo="Ausentes" />
        <Resumen valor={cargandoDashboard ? "…" : String(resumenHoy.incidencias)} titulo="Incidencias" />
      </section>

      <TituloSeccion texto="Marcaciones recientes" />

      <section style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 22,
        overflow: "hidden",
        marginBottom: 24,
      }}>
        {cargandoDashboard ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            Cargando marcaciones…
          </div>
        ) : marcacionesRecientes.length === 0 ? (
          <div style={{ padding: 18, color: "#64748b" }}>
            No hay marcaciones registradas.
          </div>
        ) : (
          marcacionesRecientes.map((m, index) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                padding: "15px 18px",
                borderBottom:
                  index < marcacionesRecientes.length - 1
                    ? "1px solid #eef2f7"
                    : "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>
                  {m.empleado}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                  {m.codigo || "Sin código"} · {horaRD(m.fechaHora)}
                  {m.confianza !== null
                    ? ` · ${Math.round(m.confianza * 100)}%`
                    : ""}
                </div>
              </div>

              <span style={{
                fontWeight: 800,
                fontSize: 12,
                padding: "7px 10px",
                borderRadius: 999,
                background: m.tipo === "ENTRADA" ? "#ecfdf5" : "#eff6ff",
                color: m.tipo === "ENTRADA" ? "#047857" : "#1d4ed8",
              }}>
                {m.tipo}
              </span>
            </div>
          ))
        )}
      </section>

      <button
        type="button"
        onClick={cargarDashboard}
        style={{
          width: "100%",
          border: "1px solid #dbe4ea",
          background: "#fff",
          borderRadius: 16,
          padding: "12px 16px",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 22,
        }}
      >
        Actualizar dashboard
      </button>

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
          icono="◉"
          titulo="Marcación facial"
          texto="Identificación 1:N y registro de entrada/salida"
          onClick={abrirReconocimiento}
        />

        <OpcionMenu icono="✓" titulo="Asistencia" texto="Marcaciones y control diario" onClick={abrirAsistencia} />
        <OpcionMenu icono="◷" titulo="Horarios" texto="Jornadas y asignaciones" onClick={abrirHorarios} />
        <OpcionMenu icono="!" titulo="Incidencias" texto="Permisos, vacaciones y licencias" onClick={abrirIncidencias} />
        <OpcionMenu icono="▤" titulo="Reportes" texto="Informes de asistencia" onClick={abrirReportes} />
        <OpcionMenu icono="▣" titulo="Dispositivos" texto="Kioscos y equipos autorizados" onClick={abrirDispositivos} />
        <OpcionMenu icono="⚙" titulo="Configuración" texto="Empresa, sucursales y parámetros" onClick={abrirConfiguracion} />
      </section>

      <button onClick={salir} style={styles.cerrarSesion}>Cerrar sesión</button>

      <Pie />
    </Layout>
  );
}

/* =========================================================
   ASISTENCIA
========================================================= */

function PantallaAsistencia({
  sesion,
  volver,
}: {
  sesion: SesionEmpresa;
  volver: () => void;
}) {
  const hoy = new Date();
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const [fecha, setFecha] = useState(fechaHoy);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [filas, setFilas] = useState<any[]>([]);

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const { data, error: consultaError } = await supabase
        .from("asistencia_diaria")
        .select(`
          id,
          empleado_id,
          fecha,
          hora_programada_entrada,
          hora_programada_salida,
          primera_entrada,
          ultima_salida,
          estado,
          minutos_tardanza,
          minutos_trabajados,
          minutos_extra,
          observacion,
          empleados!asistencia_diaria_empresa_id_empleado_id_fkey(
            codigo_empleado,
            nombres,
            apellidos
          )
        `)
        .eq("empresa_id", sesion.empresaId)
        .eq("fecha", fecha)
        .order("estado", { ascending: true });

      if (consultaError) throw consultaError;
      setFilas(data || []);
    } catch (e: any) {
      console.error("VAM FACE ASISTENCIA ERROR:", e);
      setError(e?.message || "No fue posible cargar la asistencia.");
    } finally {
      setCargando(false);
    }
  }, [sesion.empresaId, fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const hora = (v?: string | null) =>
    v ? new Intl.DateTimeFormat("es-DO", {
      hour: "2-digit", minute: "2-digit"
    }).format(new Date(v)) : "—";

  const duracion = (min?: number | null) => {
    if (min === null || min === undefined) return "—";
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${String(m).padStart(2,"0")}m`;
  };

  const badge = (estado?: string) => {
    const e = String(estado || "PENDIENTE").toUpperCase();
    const ok = ["A_TIEMPO","PRESENTE"].includes(e);
    const alerta = ["TARDANZA","INCOMPLETO"].includes(e);
    return {
      padding:"6px 9px", borderRadius:999, fontSize:11, fontWeight:800,
      background: ok ? "#ecfdf5" : alerta ? "#fff7ed" : "#f1f5f9",
      color: ok ? "#047857" : alerta ? "#c2410c" : "#475569"
    } as React.CSSProperties;
  };

  return (
    <Layout>
      <Cabecera subtitulo="Control diario" />
      <button onClick={volver} style={styles.botonVolver}>← Volver</button>

      <section style={{marginTop:24}}>
        <div style={styles.etiqueta}>Asistencia</div>
        <h1 style={styles.tituloDashboard}>Asistencia diaria</h1>
        <p style={styles.descripcion}>
          Consulta el resultado calculado de cada empleado.
        </p>
      </section>

      <section style={{
        display:"flex", gap:10, alignItems:"end", flexWrap:"wrap",
        background:"#fff", border:"1px solid #e5e7eb",
        borderRadius:18, padding:16, margin:"18px 0"
      }}>
        <label style={{flex:"1 1 220px", fontSize:12, fontWeight:700, color:"#475569"}}>
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e)=>setFecha(e.target.value)}
            style={{
              display:"block", width:"100%", boxSizing:"border-box",
              marginTop:7, padding:"12px 13px", borderRadius:12,
              border:"1px solid #cbd5e1", background:"#fff"
            }}
          />
        </label>
        <button onClick={cargar} style={{
          border:0, borderRadius:12, padding:"12px 18px",
          background:"#0f766e", color:"#fff", fontWeight:800, cursor:"pointer"
        }}>
          Actualizar
        </button>
      </section>

      {error && <div style={{
        padding:14, borderRadius:14, marginBottom:14,
        background:"#fff7ed", border:"1px solid #fed7aa", color:"#9a3412"
      }}>{error}</div>}

      <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>
        {cargando ? "Cargando…" : `${filas.length} registro(s)`}
      </div>

      <section style={{display:"grid",gap:12}}>
        {!cargando && filas.length===0 && (
          <div style={{
            padding:20, background:"#fff", border:"1px solid #e5e7eb",
            borderRadius:18, color:"#64748b"
          }}>
            No hay asistencia calculada para esta fecha.
          </div>
        )}

        {filas.map((fila:any)=>{
          const emp = Array.isArray(fila.empleados) ? fila.empleados[0] : fila.empleados;
          const nombre = `${emp?.nombres || ""} ${emp?.apellidos || ""}`.trim() || "Empleado";
          return (
            <article key={fila.id} style={{
              background:"#fff", border:"1px solid #e5e7eb",
              borderRadius:18, padding:16
            }}>
              <div style={{
                display:"flex", justifyContent:"space-between",
                gap:12, alignItems:"start", marginBottom:14
              }}>
                <div>
                  <div style={{fontWeight:800,fontSize:16,color:"#0f172a"}}>{nombre}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:3}}>
                    {emp?.codigo_empleado || "Sin código"}
                  </div>
                </div>
                <span style={badge(fila.estado)}>
                  {String(fila.estado || "PENDIENTE").replaceAll("_"," ")}
                </span>
              </div>

              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(2,minmax(0,1fr))",
                gap:10
              }}>
                <DatoAsistencia titulo="Primera entrada" valor={hora(fila.primera_entrada)} />
                <DatoAsistencia titulo="Última salida" valor={hora(fila.ultima_salida)} />
                <DatoAsistencia titulo="Tardanza" valor={`${fila.minutos_tardanza ?? 0} min`} />
                <DatoAsistencia titulo="Trabajado" valor={duracion(fila.minutos_trabajados)} />
              </div>
            </article>
          );
        })}
      </section>
      <Pie />
    </Layout>
  );
}

function DatoAsistencia({titulo,valor}:{titulo:string;valor:string}) {
  return (
    <div style={{background:"#f8fafc",borderRadius:12,padding:11}}>
      <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",fontWeight:700}}>
        {titulo}
      </div>
      <div style={{fontSize:14,fontWeight:800,color:"#0f172a",marginTop:4}}>
        {valor}
      </div>
    </div>
  );
}


/* =========================================================
   MOTOR FACIAL NEURONAL HUMAN - v0.1.32 DEV
   - Embedding facial dimensión neuronal dinámica
   - No guarda fotografías
   - Comparación 1:N con Human.match.similarity
========================================================= */
let vamHumanPromise: Promise<any> | null = null;

function cargarScriptHuman(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Human requiere navegador."));
  if ((window as any).Human?.Human) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existente = document.querySelector('script[data-vam-human="1"]') as HTMLScriptElement | null;
    if (existente) {
      existente.addEventListener("load", () => resolve(), { once: true });
      existente.addEventListener("error", () => reject(new Error("No fue posible cargar Human.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "/human.js";
    script.async = true;
    script.dataset.vamHuman = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No fue posible cargar el motor facial Human."));
    document.head.appendChild(script);
  });
}

async function obtenerHumanVam(): Promise<any> {
  if (vamHumanPromise) return vamHumanPromise;

  vamHumanPromise = (async () => {
    await cargarScriptHuman();
    const HumanGlobal = (window as any).Human;
    if (!HumanGlobal?.Human) throw new Error("Human no quedó disponible en el navegador.");

    const human = new HumanGlobal.Human({
      backend: "webgl",
      modelBasePath: "https://cdn.jsdelivr.net/npm/@vladmandic/human@3.3.6/models/",
      cacheSensitivity: 0,
      filter: { enabled: true, equalization: true, flip: false },
      face: {
        enabled: true,
        detector: { rotation: true, maxDetected: 2 },
        mesh: { enabled: true },
        description: { enabled: true },
        iris: { enabled: false },
        emotion: { enabled: false },
        antispoof: { enabled: true },
        liveness: { enabled: true },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      gesture: { enabled: false },
    });

    await human.load();
    await human.warmup();
    return human;
  })();

  return vamHumanPromise;
}

async function embeddingHumanDesdeVideo(video: HTMLVideoElement): Promise<number[]> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("La cámara todavía no está lista.");

  const human = await obtenerHumanVam();
  const resultado = await human.detect(video);

  if (!resultado?.face?.length) {
    throw new Error("No se detectó un rostro. Acércate y mejora la iluminación.");
  }
  if (resultado.face.length !== 1) {
    throw new Error("Debe aparecer una sola persona frente a la cámara.");
  }

  const rostro = resultado.face[0];
  const real = Number(rostro?.real ?? 0);
  const live = Number(rostro?.live ?? 0);
  const UMBRAL_SEGURIDAD_FACIAL = 0.60;

  if (!Number.isFinite(real) || real < UMBRAL_SEGURIDAD_FACIAL) {
    throw new Error(`Validación antispoof rechazada (${Math.round(real * 100)}%). Usa tu rostro real frente a la cámara.`);
  }
  if (!Number.isFinite(live) || live < UMBRAL_SEGURIDAD_FACIAL) {
    throw new Error(`Prueba de vida rechazada (${Math.round(live * 100)}%). Mira directamente a la cámara y vuelve a intentar.`);
  }

  const embedding = rostro?.embedding;
  if (!Array.isArray(embedding) || embedding.length < 128) {
    throw new Error("No fue posible generar el descriptor neuronal del rostro.");
  }

  return embedding.map((v: unknown) => Number(v));
}

async function similitudHuman(a: number[], b: number[]): Promise<number> {
  if (!a.length || a.length !== b.length) return 0;
  const human = await obtenerHumanVam();
  const valor = Number(human.match.similarity(a, b));
  return Math.max(0, Math.min(100, Math.round(valor * 100)));
}


/* =========================================================
   MODO KIOSCO - v0.1.32 DEV
========================================================= */
function PantallaKiosco({
  sesion,
  volver,
  abrirAdministracion,
}: {
  sesion: SesionEmpresa;
  volver: () => void;
  abrirAdministracion: () => void | Promise<void>;
}) {
  const videoRef=React.useRef<HTMLVideoElement|null>(null);
  const [stream,setStream]=useState<MediaStream|null>(null);
  const [estado,setEstado]=useState<"CAMARA"|"PROCESANDO"|"OK"|"ERROR">("CAMARA");
  const [mensaje,setMensaje]=useState("Inicializando cámara y motor facial…");
  const [detalle,setDetalle]=useState("");
  const [porcentaje,setPorcentaje]=useState<number|null>(null);
  const [hora,setHora]=useState(new Date());
  const [bloqueado,setBloqueado]=useState(false);
  const [motorListo,setMotorListo]=useState(false);

  const UMBRAL_HUMAN = 60;

  useEffect(()=>{const i=setInterval(()=>setHora(new Date()),1000);return()=>clearInterval(i)},[]);

  useEffect(()=>{
    let activo=true;

    const iniciar=async()=>{
      try{
        await obtenerHumanVam();
        if(!activo)return;
        setMotorListo(true);

        const s=await navigator.mediaDevices.getUserMedia({
          video:{facingMode:"user",width:{ideal:720},height:{ideal:720}},
          audio:false
        });

        if(!activo){s.getTracks().forEach(x=>x.stop());return;}
        setStream(s);
        if(videoRef.current){
          videoRef.current.srcObject=s;
          await videoRef.current.play();
        }
        setEstado("CAMARA");
        setMensaje("Colóquese frente a la cámara");
        setDetalle("Motor neuronal listo");
      }catch(x:any){
        setEstado("ERROR");
        setMensaje("No fue posible iniciar el reconocimiento facial");
        setDetalle(x?.message||"Verifica Internet, HTTPS y el permiso de cámara.");
      }
    };

    iniciar();
    return()=>{activo=false};
  },[]);

  useEffect(()=>()=>{stream?.getTracks().forEach(x=>x.stop())},[stream]);

  const marcar=async()=>{
    if(bloqueado||estado==="PROCESANDO"||!motorListo)return;
    setBloqueado(true);
    setEstado("PROCESANDO");
    setMensaje("Analizando rostro con IA…");
    setDetalle("Generando descriptor neuronal");
    setPorcentaje(null);

    try{
      const video=videoRef.current;
      if(!video)throw new Error("La cámara no está disponible.");

      const emb=await embeddingHumanDesdeVideo(video);

      const {data:bio,error:be}=await supabase.from("biometrias_faciales")
        .select("empleado_id,embedding,modelo,empleados!inner(id,codigo_empleado,nombres,apellidos,sucursal_id,estado)")
        .eq("empresa_id",sesion.empresaId)
        .eq("estado","ACTIVA")
        .eq("modelo","VAM_FACE_HUMAN_NEURAL");

      if(be)throw be;
      if(!bio?.length)throw new Error("No hay empleados enrolados con el nuevo motor neuronal.");

      let mejor:any=null;
      let score=-1;

      for(const b of bio){
        const arr=Array.isArray(b.embedding)?b.embedding:(b.embedding?.values||[]);
        const vector=arr.map(Number).filter((v:number)=>Number.isFinite(v));
        if(vector.length!==emb.length)continue;
        const s=await similitudHuman(vector,emb);
        if(s>score){score=s;mejor=b}
      }

      const porcentajeActual=Math.max(0,Math.min(100,Math.round(score)));
      setPorcentaje(porcentajeActual);

      if(!mejor||score<UMBRAL_HUMAN){
        throw new Error(`Rostro no reconocido. Mejor coincidencia: ${porcentajeActual}%`);
      }

      const e:any=Array.isArray(mejor.empleados)?mejor.empleados[0]:mejor.empleados;
      if(!e||e.estado!=="ACTIVO")throw new Error("Empleado no disponible para marcar.");

      const inicio=new Date();inicio.setHours(0,0,0,0);
      const {data:last,error:le}=await supabase.from("marcaciones").select("tipo,fecha_hora")
        .eq("empresa_id",sesion.empresaId).eq("empleado_id",mejor.empleado_id)
        .gte("fecha_hora",inicio.toISOString()).order("fecha_hora",{ascending:false}).limit(1);
      if(le)throw le;
      const tipo=last?.[0]?.tipo==="ENTRADA"?"SALIDA":"ENTRADA";

      const {error:re}=await supabase.rpc("registrar_marcacion_facial_dev",{
        p_empresa_id:sesion.empresaId,
        p_empleado_id:mejor.empleado_id,
        p_sucursal_id:e.sucursal_id||null,
        p_tipo:tipo,
        p_confianza:Number((score/100).toFixed(4)),
        p_dispositivo_id:"44307fba-f876-492e-b68e-bdeb4cb9a6c4"
      });
      if(re)throw re;

      setEstado("OK");
      setMensaje(`${tipo} registrada`);
      setDetalle(`${e.nombres} ${e.apellidos}`);
      setPorcentaje(Math.round(score));
    }catch(x:any){
      setEstado("ERROR");
      setMensaje(x?.message||"No fue posible registrar la marcación.");
      setDetalle("");
    }finally{
      setTimeout(()=>{
        setEstado("CAMARA");
        setMensaje("Colóquese frente a la cámara");
        setDetalle(motorListo?"Motor neuronal listo":"");
        setPorcentaje(null);
        setBloqueado(false);
      },3500);
    }
  };

  return <div style={{minHeight:"100vh",background:"#061826",color:"#fff",display:"flex",flexDirection:"column",fontFamily:"Arial, sans-serif"}}>
    <header style={{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><div style={{fontSize:20,fontWeight:900}}>VAM FACE</div><div style={{fontSize:11,opacity:.7}}>ATTENDANCE · KIOSCO AUTORIZADO</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:24,fontWeight:900}}>{hora.toLocaleTimeString("es-DO",{hour:"2-digit",minute:"2-digit"})}</div><div style={{fontSize:11,opacity:.7}}>{hora.toLocaleDateString("es-DO",{dateStyle:"medium"})}</div></div>
    </header>
    <main style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:18}}>
      <div style={{width:"min(92vw,520px)",aspectRatio:"1 / 1",maxHeight:"64vh",overflow:"hidden",borderRadius:28,position:"relative",background:"#000",boxShadow:"0 18px 60px rgba(0,0,0,.35)"}}>
        <video ref={videoRef} playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}}/>
        <div style={styles.guiaRostro} />
      </div>
      <div style={{textAlign:"center",marginTop:18,minHeight:88}}>
        <div style={{fontSize:estado==="OK"?27:22,fontWeight:900,color:estado==="OK"?"#6ee7b7":estado==="ERROR"?"#fca5a5":"#fff"}}>{mensaje}</div>
        {detalle&&<div style={{fontSize:15,marginTop:6,opacity:.85}}>{detalle}</div>}
        {porcentaje!==null&&<div style={{fontSize:30,fontWeight:900,marginTop:8,color:porcentaje>=UMBRAL_HUMAN?"#6ee7b7":"#fca5a5"}}>{porcentaje}%</div>}
        <div style={{fontSize:12,marginTop:6,opacity:.6}}>Umbral neuronal DEV: {UMBRAL_HUMAN}%</div>
      </div>
      <button disabled={bloqueado||!motorListo} onClick={marcar} style={{width:"min(92vw,520px)",border:0,borderRadius:18,padding:"17px 20px",fontSize:18,fontWeight:900,background:(bloqueado||!motorListo)?"#475569":"#14b8a6",color:"#fff"}}>
        {!motorListo?"CARGANDO MOTOR…":estado==="PROCESANDO"?"VERIFICANDO…":"MARCAR AHORA"}
      </button>
      <button onClick={abrirAdministracion} style={{marginTop:14,border:"1px solid rgba(148,163,184,.35)",borderRadius:12,background:"transparent",color:"#94a3b8",fontSize:12,padding:"9px 14px"}}>⚙ Administración</button>
    </main>
    <div style={{textAlign:"center",padding:12,fontSize:10,opacity:.45}}>v0.1.32 DEV · Human neural embedding dimensión neuronal dinámica</div>
  </div>
}

/* =========================================================
   CONFIGURACIÓN SaaS
========================================================= */
function PantallaConfiguracion({ sesion, volver }: { sesion: SesionEmpresa; volver: () => void }) {
  const [empresa,setEmpresa]=useState<any>(null);
  const [sucursales,setSucursales]=useState<any[]>([]);
  const [departamentos,setDepartamentos]=useState<any[]>([]);
  const [tab,setTab]=useState<"empresa"|"sucursales"|"departamentos"|"usuarios">("empresa");
  const [cargando,setCargando]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState("");
  const [mensaje,setMensaje]=useState("");

  const [empresaForm,setEmpresaForm]=useState<any>({});
  const [sucForm,setSucForm]=useState<any>({id:null,nombre:"",codigo:"",direccion:"",ciudad:"",pais:"República Dominicana",telefono:"",email:"",estado:"ACTIVA"});
  const [depForm,setDepForm]=useState<any>({id:null,sucursal_id:"",nombre:"",codigo:"",descripcion:"",estado:"ACTIVO"});
  const [formSuc,setFormSuc]=useState(false);
  const [formDep,setFormDep]=useState(false);
  const [usuarios,setUsuarios]=useState<any[]>([]);
  const [cargandoUsuarios,setCargandoUsuarios]=useState(false);
  const [emailUsuario,setEmailUsuario]=useState("");
  const [rolUsuario,setRolUsuario]=useState("EMPLEADO");

  const cargar=React.useCallback(async()=>{
    setCargando(true);setError("");
    try{
      const [e,s,d]=await Promise.all([
        supabase.from("empresas").select("*").eq("id",sesion.empresaId).single(),
        supabase.from("sucursales").select("*").eq("empresa_id",sesion.empresaId).order("nombre"),
        supabase.from("departamentos").select("*").eq("empresa_id",sesion.empresaId).order("nombre")
      ]);
      if(e.error) throw e.error;if(s.error) throw s.error;if(d.error) throw d.error;
      setEmpresa(e.data);setEmpresaForm(e.data||{});setSucursales(s.data||[]);setDepartamentos(d.data||[]);
    }catch(x:any){setError(x?.message||"No fue posible cargar la configuración.");}
    finally{setCargando(false);}
  },[sesion.empresaId]);

  useEffect(()=>{cargar();},[cargar]);

  const guardarEmpresa=async(e:React.FormEvent)=>{
    e.preventDefault();setGuardando(true);setError("");setMensaje("");
    try{
      const payload={
        nombre:empresaForm.nombre||"",
        nombre_comercial:empresaForm.nombre_comercial||null,
        identificacion_fiscal:empresaForm.identificacion_fiscal||null,
        email:empresaForm.email||null,telefono:empresaForm.telefono||null,
        direccion:empresaForm.direccion||null,ciudad:empresaForm.ciudad||null,
        pais:empresaForm.pais||null,estado:empresaForm.estado||"ACTIVA",
        updated_at:new Date().toISOString()
      };
      const {error}=await supabase.from("empresas").update(payload).eq("id",sesion.empresaId);
      if(error) throw error;setMensaje("Datos de la empresa actualizados.");await cargar();
    }catch(x:any){setError(x?.message||"No fue posible actualizar la empresa.");}
    finally{setGuardando(false);}
  };

  const guardarSucursal=async(e:React.FormEvent)=>{
    e.preventDefault();setGuardando(true);setError("");setMensaje("");
    try{
      const payload={empresa_id:sesion.empresaId,nombre:sucForm.nombre.trim(),codigo:sucForm.codigo.trim(),direccion:sucForm.direccion||null,ciudad:sucForm.ciudad||null,pais:sucForm.pais||null,telefono:sucForm.telefono||null,email:sucForm.email||null,estado:sucForm.estado,updated_at:new Date().toISOString()};
      const r=sucForm.id?await supabase.from("sucursales").update(payload).eq("id",sucForm.id).eq("empresa_id",sesion.empresaId):await supabase.from("sucursales").insert(payload);
      if(r.error) throw r.error;setMensaje(sucForm.id?"Sucursal actualizada.":"Sucursal creada.");setFormSuc(false);await cargar();
    }catch(x:any){setError(x?.message||"No fue posible guardar la sucursal.");}
    finally{setGuardando(false);}
  };

  const guardarDepartamento=async(e:React.FormEvent)=>{
    e.preventDefault();setGuardando(true);setError("");setMensaje("");
    try{
      const payload={empresa_id:sesion.empresaId,sucursal_id:depForm.sucursal_id||null,nombre:depForm.nombre.trim(),codigo:depForm.codigo.trim(),descripcion:depForm.descripcion||null,estado:depForm.estado,updated_at:new Date().toISOString()};
      const r=depForm.id?await supabase.from("departamentos").update(payload).eq("id",depForm.id).eq("empresa_id",sesion.empresaId):await supabase.from("departamentos").insert(payload);
      if(r.error) throw r.error;setMensaje(depForm.id?"Departamento actualizado.":"Departamento creado.");setFormDep(false);await cargar();
    }catch(x:any){setError(x?.message||"No fue posible guardar el departamento.");}
    finally{setGuardando(false);}
  };

  const llamarApiUsuarios=async(method:"GET"|"POST"|"PATCH",body?:any)=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error("La sesión expiró. Inicia sesión nuevamente.");
    const r=await fetch("/api/vam-face/usuarios",{
      method,
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${session.access_token}`
      },
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j?.error||"No fue posible completar la operación.");
    return j;
  };

  const cargarUsuarios=React.useCallback(async()=>{
    if(sesion.rol!=="ADMIN_EMPRESA") return;
    setCargandoUsuarios(true);setError("");
    try{
      const j=await llamarApiUsuarios("GET");
      setUsuarios(j.usuarios||[]);
    }catch(x:any){setError(x?.message||"No fue posible cargar los usuarios.");}
    finally{setCargandoUsuarios(false);}
  },[sesion.rol]);

  useEffect(()=>{if(tab==="usuarios") cargarUsuarios();},[tab,cargarUsuarios]);

  const invitarUsuario=async(e:React.FormEvent)=>{
    e.preventDefault();setGuardando(true);setError("");setMensaje("");
    try{
      const j=await llamarApiUsuarios("POST",{email:emailUsuario.trim(),rol:rolUsuario});
      setMensaje(j.mensaje||"Usuario invitado y vinculado correctamente.");
      setEmailUsuario("");setRolUsuario("EMPLEADO");await cargarUsuarios();
    }catch(x:any){setError(x?.message||"No fue posible invitar el usuario.");}
    finally{setGuardando(false);}
  };

  const actualizarUsuario=async(id:string,rol:string,estado:string)=>{
    setGuardando(true);setError("");setMensaje("");
    try{
      const j=await llamarApiUsuarios("PATCH",{id,rol,estado});
      setMensaje(j.mensaje||"Usuario actualizado.");await cargarUsuarios();
    }catch(x:any){setError(x?.message||"No fue posible actualizar el usuario.");}
    finally{setGuardando(false);}
  };

  const campo:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px 11px",borderRadius:11,border:"1px solid #cbd5e1",background:"#fff",marginTop:5};
  const btn=(activo:boolean):React.CSSProperties=>({border:0,borderRadius:999,padding:"9px 13px",fontWeight:800,cursor:"pointer",background:activo?"#0f766e":"#e2e8f0",color:activo?"#fff":"#334155"});
  const sucNombre=(id:string|null)=>id?(sucursales.find(s=>s.id===id)?.nombre||"Sucursal"):"General";

  return <Layout>
    <Cabecera subtitulo="Configuración SaaS" />
    <button onClick={volver} style={styles.botonVolver}>← Volver</button>
    <section style={{marginTop:24}}>
      <div style={styles.etiqueta}>Configuración</div>
      <h1 style={styles.tituloDashboard}>Empresa y estructura</h1>
      <p style={styles.descripcion}>Administra los datos de tu empresa, sucursales y departamentos.</p>
    </section>

    {error&&<div style={{padding:14,borderRadius:14,marginTop:14,background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"}}>{error}</div>}
    {mensaje&&<div style={{padding:14,borderRadius:14,marginTop:14,background:"#ecfdf5",border:"1px solid #a7f3d0",color:"#047857"}}>{mensaje}</div>}

    <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"18px 0"}}>
      <button style={btn(tab==="empresa")} onClick={()=>setTab("empresa")}>Empresa</button>
      <button style={btn(tab==="sucursales")} onClick={()=>setTab("sucursales")}>Sucursales</button>
      <button style={btn(tab==="departamentos")} onClick={()=>setTab("departamentos")}>Departamentos</button>
      {sesion.rol==="ADMIN_EMPRESA"&&<button style={btn(tab==="usuarios")} onClick={()=>setTab("usuarios")}>Usuarios y roles</button>}
    </div>

    {cargando?<div style={{padding:18}}>Cargando configuración…</div>:<>
      {tab==="empresa"&&<form onSubmit={guardarEmpresa} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:16}}>
        <h3 style={{marginTop:0}}>Datos de la empresa</h3>
        {[
          ["nombre","Nombre legal"],["nombre_comercial","Nombre comercial"],["identificacion_fiscal","Identificación fiscal / RNC"],
          ["email","Correo"],["telefono","Teléfono"],["direccion","Dirección"],["ciudad","Ciudad"],["pais","País"]
        ].map(([k,l])=><label key={k} style={{display:"block",fontSize:12,fontWeight:700,marginTop:10}}>{l}<input value={empresaForm[k]||""} onChange={e=>setEmpresaForm({...empresaForm,[k]:e.target.value})} style={campo}/></label>)}
        <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:10}}>Estado<select value={empresaForm.estado||"ACTIVA"} onChange={e=>setEmpresaForm({...empresaForm,estado:e.target.value})} style={campo}><option value="ACTIVA">ACTIVA</option><option value="INACTIVA">INACTIVA</option><option value="SUSPENDIDA">SUSPENDIDA</option></select></label>
        <button disabled={guardando} style={{marginTop:14,border:0,borderRadius:11,padding:"11px 15px",background:"#0f766e",color:"#fff",fontWeight:800}}>{guardando?"Guardando…":"Guardar empresa"}</button>
      </form>}

      {tab==="sucursales"&&<section>
        <button onClick={()=>{setSucForm({id:null,nombre:"",codigo:"",direccion:"",ciudad:"",pais:"República Dominicana",telefono:"",email:"",estado:"ACTIVA"});setFormSuc(true)}} style={{border:0,borderRadius:11,padding:"11px 15px",background:"#0f766e",color:"#fff",fontWeight:800}}>+ Nueva sucursal</button>
        {formSuc&&<form onSubmit={guardarSucursal} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:16,marginTop:12}}>
          <h3>{sucForm.id?"Editar sucursal":"Nueva sucursal"}</h3>
          {["nombre","codigo","direccion","ciudad","pais","telefono","email"].map(k=><label key={k} style={{display:"block",fontSize:12,fontWeight:700,marginTop:9}}>{k.charAt(0).toUpperCase()+k.slice(1)}<input value={sucForm[k]||""} onChange={e=>setSucForm({...sucForm,[k]:e.target.value})} style={campo} required={k==="nombre"||k==="codigo"}/></label>)}
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:9}}>Estado<select value={sucForm.estado} onChange={e=>setSucForm({...sucForm,estado:e.target.value})} style={campo}><option value="ACTIVA">ACTIVA</option><option value="INACTIVA">INACTIVA</option></select></label>
          <div style={{display:"flex",gap:8,marginTop:12}}><button disabled={guardando} style={{border:0,borderRadius:10,padding:"10px 14px",background:"#0f766e",color:"#fff",fontWeight:800}}>Guardar</button><button type="button" onClick={()=>setFormSuc(false)} style={{border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 14px",background:"#fff"}}>Cancelar</button></div>
        </form>}
        <div style={{display:"grid",gap:10,marginTop:14}}>{sucursales.map((x:any)=><article key={x.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:14}}><b>{x.nombre}</b><div style={{fontSize:12,color:"#64748b",marginTop:4}}>{x.codigo} · {x.ciudad||"Sin ciudad"} · {x.estado}</div><button onClick={()=>{setSucForm({...x});setFormSuc(true)}} style={{marginTop:9,border:"1px solid #cbd5e1",background:"#fff",borderRadius:9,padding:"7px 10px",fontWeight:700}}>Editar</button></article>)}</div>
      </section>}

      {tab==="departamentos"&&<section>
        <button onClick={()=>{setDepForm({id:null,sucursal_id:"",nombre:"",codigo:"",descripcion:"",estado:"ACTIVO"});setFormDep(true)}} style={{border:0,borderRadius:11,padding:"11px 15px",background:"#0f766e",color:"#fff",fontWeight:800}}>+ Nuevo departamento</button>
        {formDep&&<form onSubmit={guardarDepartamento} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:16,marginTop:12}}>
          <h3>{depForm.id?"Editar departamento":"Nuevo departamento"}</h3>
          <label style={{display:"block",fontSize:12,fontWeight:700}}>Sucursal<select value={depForm.sucursal_id||""} onChange={e=>setDepForm({...depForm,sucursal_id:e.target.value})} style={campo}><option value="">General / sin sucursal</option>{sucursales.map((s:any)=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
          {["nombre","codigo","descripcion"].map(k=><label key={k} style={{display:"block",fontSize:12,fontWeight:700,marginTop:9}}>{k.charAt(0).toUpperCase()+k.slice(1)}<input value={depForm[k]||""} onChange={e=>setDepForm({...depForm,[k]:e.target.value})} style={campo} required={k!=="descripcion"}/></label>)}
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:9}}>Estado<select value={depForm.estado} onChange={e=>setDepForm({...depForm,estado:e.target.value})} style={campo}><option value="ACTIVO">ACTIVO</option><option value="INACTIVO">INACTIVO</option></select></label>
          <div style={{display:"flex",gap:8,marginTop:12}}><button disabled={guardando} style={{border:0,borderRadius:10,padding:"10px 14px",background:"#0f766e",color:"#fff",fontWeight:800}}>Guardar</button><button type="button" onClick={()=>setFormDep(false)} style={{border:"1px solid #cbd5e1",borderRadius:10,padding:"10px 14px",background:"#fff"}}>Cancelar</button></div>
        </form>}
        <div style={{display:"grid",gap:10,marginTop:14}}>{departamentos.map((x:any)=><article key={x.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:14}}><b>{x.nombre}</b><div style={{fontSize:12,color:"#64748b",marginTop:4}}>{x.codigo} · {sucNombre(x.sucursal_id)} · {x.estado}</div><button onClick={()=>{setDepForm({...x,sucursal_id:x.sucursal_id||""});setFormDep(true)}} style={{marginTop:9,border:"1px solid #cbd5e1",background:"#fff",borderRadius:9,padding:"7px 10px",fontWeight:700}}>Editar</button></article>)}</div>
      </section>}

      {tab==="usuarios"&&sesion.rol==="ADMIN_EMPRESA"&&<section>
        <form onSubmit={invitarUsuario} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:16}}>
          <h3 style={{marginTop:0}}>Invitar usuario</h3>
          <p style={{fontSize:12,color:"#64748b"}}>El usuario recibirá una invitación de acceso y quedará vinculado únicamente a esta empresa.</p>
          <label style={{display:"block",fontSize:12,fontWeight:700}}>Correo electrónico<input type="email" value={emailUsuario} onChange={e=>setEmailUsuario(e.target.value)} style={campo} required/></label>
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:10}}>Rol<select value={rolUsuario} onChange={e=>setRolUsuario(e.target.value)} style={campo}><option value="ADMIN_EMPRESA">Administrador empresa</option><option value="RRHH">RRHH</option><option value="SUPERVISOR">Supervisor</option><option value="EMPLEADO">Empleado</option></select></label>
          <button disabled={guardando} style={{marginTop:14,border:0,borderRadius:11,padding:"11px 15px",background:"#0f766e",color:"#fff",fontWeight:800}}>{guardando?"Procesando…":"Invitar usuario"}</button>
        </form>

        <TituloSeccion texto="Usuarios de la empresa" />
        {cargandoUsuarios?<div style={{padding:18}}>Cargando usuarios…</div>:<div style={{display:"grid",gap:10}}>
          {usuarios.length===0&&<div style={{padding:18,background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,color:"#64748b"}}>No hay usuarios vinculados.</div>}
          {usuarios.map((u:any)=><article key={u.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:14}}>
            <div style={{fontWeight:800,color:"#0f172a"}}>{u.email||"Usuario Auth"}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:3}}>{u.auth_user_id}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
              <select value={u.rol} onChange={e=>setUsuarios(v=>v.map(x=>x.id===u.id?{...x,rol:e.target.value}:x))} style={campo}><option value="ADMIN_EMPRESA">ADMIN_EMPRESA</option><option value="RRHH">RRHH</option><option value="SUPERVISOR">SUPERVISOR</option><option value="EMPLEADO">EMPLEADO</option></select>
              <select value={u.estado} onChange={e=>setUsuarios(v=>v.map(x=>x.id===u.id?{...x,estado:e.target.value}:x))} style={campo}><option value="ACTIVO">ACTIVO</option><option value="INACTIVO">INACTIVO</option></select>
            </div>
            <button disabled={guardando} onClick={()=>actualizarUsuario(u.id,u.rol,u.estado)} style={{marginTop:10,border:"1px solid #cbd5e1",background:"#fff",borderRadius:9,padding:"8px 11px",fontWeight:700}}>Guardar cambios</button>
          </article>)}
        </div>}
      </section>}
    </>}
    <Pie />
  </Layout>;
}

/* =========================================================
   REPORTES
========================================================= */
function PantallaReportes({ sesion, volver }: { sesion: SesionEmpresa; volver: () => void }) {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0,10);
  const hoyTxt = hoy.toISOString().slice(0,10);

  const [desde,setDesde]=useState(inicioMes);
  const [hasta,setHasta]=useState(hoyTxt);
  const [empleadoId,setEmpleadoId]=useState("");
  const [estadoFiltro,setEstadoFiltro]=useState("");
  const [empleadosRep,setEmpleadosRep]=useState<any[]>([]);
  const [filas,setFilas]=useState<any[]>([]);
  const [cargando,setCargando]=useState(false);
  const [error,setError]=useState("");

  const cargarEmpleados=React.useCallback(async()=>{
    const {data,error}=await supabase.from("empleados")
      .select("id,codigo_empleado,nombres,apellidos")
      .eq("empresa_id",sesion.empresaId).order("nombres");
    if(!error) setEmpleadosRep(data||[]);
  },[sesion.empresaId]);

  useEffect(()=>{cargarEmpleados();},[cargarEmpleados]);

  const consultar=React.useCallback(async()=>{
    setCargando(true);setError("");
    try{
      let q=supabase.from("asistencia_diaria")
        .select(`id,fecha,empleado_id,estado,primera_entrada,ultima_salida,minutos_tardanza,minutos_trabajados,minutos_extra,
          empleados!asistencia_diaria_empresa_id_empleado_id_fkey(id,codigo_empleado,nombres,apellidos)`)
        .eq("empresa_id",sesion.empresaId)
        .gte("fecha",desde).lte("fecha",hasta)
        .order("fecha",{ascending:false});
      if(empleadoId) q=q.eq("empleado_id",empleadoId);
      if(estadoFiltro) q=q.eq("estado",estadoFiltro);
      const {data,error}=await q;
      if(error) throw error;
      setFilas(data||[]);
    }catch(e:any){setError(e?.message||"No fue posible generar el reporte.");}
    finally{setCargando(false);}
  },[sesion.empresaId,desde,hasta,empleadoId,estadoFiltro]);

  useEffect(()=>{consultar();},[consultar]);

  const totalTrabajados=filas.filter(x=>["A_TIEMPO","TARDANZA"].includes(x.estado)).length;
  const tardanzas=filas.filter(x=>x.estado==="TARDANZA").length;
  const ausencias=filas.filter(x=>x.estado==="AUSENTE").length;
  const minutos=filas.reduce((a,x)=>a+Number(x.minutos_trabajados||0),0);
  const extras=filas.reduce((a,x)=>a+Number(x.minutos_extra||0),0);

  const hm=(m:number)=>`${Math.floor(m/60)}h ${String(m%60).padStart(2,"0")}m`;
  const hora=(v:string|null)=>v?new Intl.DateTimeFormat("es-DO",{hour:"2-digit",minute:"2-digit"}).format(new Date(v)):"—";
  const emp=(x:any)=>{
    const e=Array.isArray(x.empleados)?x.empleados[0]:x.empleados;
    return e||empleadosRep.find(z=>z.id===x.empleado_id);
  };

  const campo:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px 11px",borderRadius:11,border:"1px solid #cbd5e1",background:"#fff",marginTop:5};

  return <Layout>
    <Cabecera subtitulo="Reportes de asistencia" />
    <button onClick={volver} style={styles.botonVolver}>← Volver</button>
    <section style={{marginTop:24}}>
      <div style={styles.etiqueta}>Reportes</div>
      <h1 style={styles.tituloDashboard}>Reporte de asistencia</h1>
      <p style={styles.descripcion}>Consulta asistencia, tardanzas, ausencias y horas trabajadas por período.</p>
    </section>

    {error&&<div style={{padding:14,borderRadius:14,marginTop:14,background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"}}>{error}</div>}

    <section style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:14,marginTop:18}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
        <label style={{fontSize:12,fontWeight:700}}>Desde<input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={campo}/></label>
        <label style={{fontSize:12,fontWeight:700}}>Hasta<input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={campo}/></label>
        <label style={{fontSize:12,fontWeight:700}}>Empleado<select value={empleadoId} onChange={e=>setEmpleadoId(e.target.value)} style={campo}><option value="">Todos</option>{empleadosRep.map((e:any)=><option key={e.id} value={e.id}>{e.codigo_empleado} · {e.nombres} {e.apellidos}</option>)}</select></label>
        <label style={{fontSize:12,fontWeight:700}}>Estado<select value={estadoFiltro} onChange={e=>setEstadoFiltro(e.target.value)} style={campo}><option value="">Todos</option><option value="A_TIEMPO">A tiempo</option><option value="TARDANZA">Tardanza</option><option value="AUSENTE">Ausente</option><option value="INCOMPLETO">Incompleto</option><option value="DESCANSO">Descanso</option><option value="VACACIONES">Vacaciones</option><option value="PERMISO">Permiso</option><option value="LICENCIA_MEDICA">Licencia médica</option><option value="AUSENCIA_JUSTIFICADA">Ausencia justificada</option><option value="FERIADO">Feriado</option></select></label>
      </div>
      <button onClick={consultar} style={{marginTop:12,border:0,borderRadius:11,padding:"10px 15px",background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"}}>Actualizar reporte</button>
    </section>

    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginTop:16}}>
      {[
        ["Registros",filas.length],
        ["Días trabajados",totalTrabajados],
        ["Tardanzas",tardanzas],
        ["Ausencias",ausencias],
        ["Horas trabajadas",hm(minutos)],
        ["Horas extra",hm(extras)]
      ].map(([a,b])=><div key={String(a)} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:14}}>
        <div style={{fontSize:11,color:"#64748b",fontWeight:700}}>{a}</div>
        <div style={{fontSize:21,fontWeight:900,color:"#0f172a",marginTop:5}}>{b}</div>
      </div>)}
    </section>

    <TituloSeccion texto="Detalle del período" />
    {cargando?<div style={{padding:18,color:"#64748b"}}>Generando reporte…</div>:<section style={{display:"grid",gap:10,marginBottom:24}}>
      {filas.length===0&&<div style={{padding:18,background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,color:"#64748b"}}>No hay registros para los filtros seleccionados.</div>}
      {filas.map((x:any)=>{
        const e=emp(x);
        return <article key={x.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}>
            <div><div style={{fontWeight:800,color:"#0f172a"}}>{e?`${e.nombres} ${e.apellidos}`:"Empleado"}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{e?.codigo_empleado||""} · {x.fecha}</div></div>
            <span style={{fontSize:10,fontWeight:900,padding:"6px 8px",borderRadius:999,background:"#f1f5f9",color:"#334155"}}>{x.estado}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12,fontSize:11,color:"#475569"}}>
            <div><b>Entrada</b><br/>{hora(x.primera_entrada)}</div>
            <div><b>Salida</b><br/>{hora(x.ultima_salida)}</div>
            <div><b>Tardanza</b><br/>{x.minutos_tardanza||0} min</div>
            <div><b>Trabajado</b><br/>{hm(Number(x.minutos_trabajados||0))}</div>
          </div>
        </article>
      })}
    </section>}
    <Pie />
  </Layout>;
}

/* =========================================================
   DISPOSITIVOS
========================================================= */
function PantallaDispositivos({ sesion, volver }: { sesion: SesionEmpresa; volver: () => void }) {
  const [items,setItems]=useState<any[]>([]);
  const [sucursales,setSucursales]=useState<any[]>([]);
  const [cargando,setCargando]=useState(true);
  const [guardando,setGuardando]=useState(false);
  const [error,setError]=useState("");
  const [mensaje,setMensaje]=useState("");
  const [form,setForm]=useState(false);
  const [editando,setEditando]=useState<string|null>(null);
  const [nombre,setNombre]=useState("");
  const [codigo,setCodigo]=useState("");
  const [sucursalId,setSucursalId]=useState("");
  const [plataforma,setPlataforma]=useState("ANDROID");
  const [modo,setModo]=useState("KIOSCO");
  const [identificador,setIdentificador]=useState("");
  const [estado,setEstado]=useState("AUTORIZADO");
  const [versionApp,setVersionApp]=useState("v0.1.21");

  const cargar=React.useCallback(async()=>{
    setCargando(true); setError("");
    try{
      const [d,s]=await Promise.all([
        supabase.from("dispositivos").select("*").eq("empresa_id",sesion.empresaId).order("created_at",{ascending:false}),
        supabase.from("sucursales").select("id,nombre,codigo,estado").eq("empresa_id",sesion.empresaId).order("nombre")
      ]);
      if(d.error) throw d.error; if(s.error) throw s.error;
      setItems(d.data||[]); setSucursales(s.data||[]);
    }catch(e:any){setError(e?.message||"No fue posible cargar los dispositivos.");}
    finally{setCargando(false);}
  },[sesion.empresaId]);

  useEffect(()=>{cargar();},[cargar]);

  const limpiar=()=>{setEditando(null);setNombre("");setCodigo("");setSucursalId("");setPlataforma("ANDROID");setModo("KIOSCO");setIdentificador("");setEstado("AUTORIZADO");setVersionApp("v0.1.21");};

  const editar=(x:any)=>{setEditando(x.id);setNombre(x.nombre||"");setCodigo(x.codigo||"");setSucursalId(x.sucursal_id||"");setPlataforma(x.plataforma||"ANDROID");setModo(x.modo||"KIOSCO");setIdentificador(x.identificador_dispositivo||"");setEstado(x.estado||"AUTORIZADO");setVersionApp(x.version_app||"");setForm(true);setMensaje("");};

  const guardar=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!nombre.trim()||!codigo.trim()||!identificador.trim()){setError("Nombre, código e identificador son obligatorios.");return;}
    setGuardando(true);setError("");setMensaje("");
    const payload={empresa_id:sesion.empresaId,sucursal_id:sucursalId||null,nombre:nombre.trim(),codigo:codigo.trim(),plataforma,modo,identificador_dispositivo:identificador.trim(),estado,version_app:versionApp.trim()||null,updated_at:new Date().toISOString()};
    try{
      const r=editando
        ? await supabase.from("dispositivos").update(payload).eq("id",editando).eq("empresa_id",sesion.empresaId)
        : await supabase.from("dispositivos").insert(payload);
      if(r.error) throw r.error;
      setMensaje(editando?"Dispositivo actualizado correctamente.":"Dispositivo registrado correctamente.");
      setForm(false);limpiar();await cargar();
    }catch(e:any){setError(e?.message||"No fue posible guardar el dispositivo.");}
    finally{setGuardando(false);}
  };

  const cambiarEstado=async(x:any,nuevo:string)=>{
    setError("");setMensaje("");
    try{
      const {error}=await supabase.from("dispositivos").update({estado:nuevo,updated_at:new Date().toISOString()}).eq("id",x.id).eq("empresa_id",sesion.empresaId);
      if(error) throw error;
      setMensaje(nuevo==="AUTORIZADO"?"Dispositivo autorizado.":"Dispositivo revocado.");
      await cargar();
    }catch(e:any){setError(e?.message||"No fue posible cambiar el estado.");}
  };

  const suc=(id:string|null)=>!id?"Sin sucursal":(sucursales.find(x=>x.id===id)?.nombre||"Sucursal");
  const fecha=(v:string|null)=>v?new Intl.DateTimeFormat("es-DO",{dateStyle:"short",timeStyle:"short"}).format(new Date(v)):"Sin conexión registrada";
  const campo:React.CSSProperties={width:"100%",boxSizing:"border-box",padding:"11px 12px",borderRadius:12,border:"1px solid #cbd5e1",background:"#fff",marginTop:6};

  return <Layout>
    <Cabecera subtitulo="Kioscos y equipos autorizados" />
    <button onClick={volver} style={styles.botonVolver}>← Volver</button>
    <section style={{marginTop:24}}>
      <div style={styles.etiqueta}>Dispositivos</div>
      <h1 style={styles.tituloDashboard}>Gestión de dispositivos</h1>
      <p style={styles.descripcion}>Administra los equipos autorizados para registrar asistencia.</p>
    </section>

    {error&&<div style={{padding:14,borderRadius:14,marginTop:14,background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"}}>{error}</div>}
    {mensaje&&<div style={{padding:14,borderRadius:14,marginTop:14,background:"#ecfdf5",border:"1px solid #a7f3d0",color:"#047857"}}>{mensaje}</div>}

    <div style={{margin:"18px 0"}}><button onClick={()=>{limpiar();setForm(true)}} style={{border:0,borderRadius:12,padding:"12px 16px",background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"}}>+ Registrar dispositivo</button></div>

    {form&&<form onSubmit={guardar} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:16,marginBottom:20}}>
      <h3 style={{marginTop:0}}>{editando?"Editar dispositivo":"Nuevo dispositivo"}</h3>
      <label style={{fontSize:12,fontWeight:700}}>Nombre<input value={nombre} onChange={e=>setNombre(e.target.value)} style={campo} required /></label>
      <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>Código<input value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase())} placeholder="KIOSCO-001" style={campo} required /></label>
      <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>Sucursal<select value={sucursalId} onChange={e=>setSucursalId(e.target.value)} style={campo}><option value="">Sin sucursal específica</option>{sucursales.map((s:any)=><option key={s.id} value={s.id}>{s.codigo?`${s.codigo} · `:""}{s.nombre}</option>)}</select></label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
        <label style={{fontSize:12,fontWeight:700}}>Plataforma<select value={plataforma} onChange={e=>setPlataforma(e.target.value)} style={campo}><option value="ANDROID">ANDROID</option><option value="IOS">IOS</option><option value="WEB">WEB</option></select></label>
        <label style={{fontSize:12,fontWeight:700}}>Modo<select value={modo} onChange={e=>setModo(e.target.value)} style={campo}><option value="KIOSCO">KIOSCO</option><option value="MOVIL">MÓVIL</option></select></label>
      </div>
      <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>Identificador único<input value={identificador} onChange={e=>setIdentificador(e.target.value)} placeholder="VAM-FACE-ANDROID-001" style={campo} required /></label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
        <label style={{fontSize:12,fontWeight:700}}>Versión app<input value={versionApp} onChange={e=>setVersionApp(e.target.value)} style={campo}/></label>
        <label style={{fontSize:12,fontWeight:700}}>Estado<select value={estado} onChange={e=>setEstado(e.target.value)} style={campo}><option value="AUTORIZADO">AUTORIZADO</option><option value="REVOCADO">REVOCADO</option></select></label>
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button disabled={guardando} style={{border:0,borderRadius:12,padding:"11px 16px",background:"#0f766e",color:"#fff",fontWeight:800}}>{guardando?"Guardando…":"Guardar dispositivo"}</button>
        <button type="button" onClick={()=>setForm(false)} style={{border:"1px solid #cbd5e1",borderRadius:12,padding:"11px 16px",background:"#fff",fontWeight:700}}>Cancelar</button>
      </div>
    </form>}

    <TituloSeccion texto="Dispositivos registrados" />
    {cargando?<div style={{padding:18,color:"#64748b"}}>Cargando…</div>:<section style={{display:"grid",gap:12,marginBottom:24}}>
      {items.length===0&&<div style={{padding:18,background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,color:"#64748b"}}>No hay dispositivos registrados.</div>}
      {items.map((x:any)=><article key={x.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
          <div><div style={{fontWeight:800,color:"#0f172a"}}>{x.nombre}</div><div style={{fontSize:11,color:"#64748b",marginTop:3}}>{x.codigo}</div></div>
          <span style={{fontSize:11,fontWeight:800,padding:"6px 9px",borderRadius:999,height:"fit-content",background:x.estado==="AUTORIZADO"?"#ecfdf5":"#fef2f2",color:x.estado==="AUTORIZADO"?"#047857":"#b91c1c"}}>{x.estado}</span>
        </div>
        <div style={{fontSize:12,color:"#475569",marginTop:10}}>{x.plataforma} · {x.modo} · {suc(x.sucursal_id)}</div>
        <div style={{fontSize:12,color:"#475569",marginTop:5}}>ID: {x.identificador_dispositivo||"—"}</div>
        <div style={{fontSize:11,color:"#64748b",marginTop:5}}>Versión: {x.version_app||"—"} · Última conexión: {fecha(x.ultima_conexion)}</div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
          <button onClick={()=>editar(x)} style={{border:"1px solid #cbd5e1",background:"#fff",borderRadius:10,padding:"8px 11px",fontWeight:700}}>Editar</button>
          {x.estado==="AUTORIZADO"
            ? <button onClick={()=>cambiarEstado(x,"REVOCADO")} style={{border:"1px solid #fecaca",background:"#fff",color:"#b91c1c",borderRadius:10,padding:"8px 11px",fontWeight:700}}>Revocar</button>
            : <button onClick={()=>cambiarEstado(x,"AUTORIZADO")} style={{border:0,background:"#0f766e",color:"#fff",borderRadius:10,padding:"8px 11px",fontWeight:700}}>Autorizar</button>}
        </div>
      </article>)}
    </section>}
    <Pie />
  </Layout>;
}

/* =========================================================
   INCIDENCIAS
========================================================= */

function PantallaIncidencias({
  sesion,
  volver,
}: {
  sesion: SesionEmpresa;
  volver: () => void;
}) {
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [empleadosInc, setEmpleadosInc] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const hoy = new Date().toISOString().slice(0, 10);

  const [empleadoId, setEmpleadoId] = useState("");
  const [tipo, setTipo] = useState("VACACIONES");
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [usarHoras, setUsarHoras] = useState(false);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");

  const cargar = React.useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [i, e] = await Promise.all([
        supabase
          .from("incidencias")
          .select("*")
          .eq("empresa_id", sesion.empresaId)
          .order("fecha_inicio", { ascending: false }),
        supabase
          .from("empleados")
          .select("id,codigo_empleado,nombres,apellidos,estado")
          .eq("empresa_id", sesion.empresaId)
          .eq("estado", "ACTIVO")
          .order("nombres"),
      ]);

      if (i.error) throw i.error;
      if (e.error) throw e.error;

      setIncidencias(i.data || []);
      setEmpleadosInc(e.data || []);
    } catch (err: any) {
      console.error("VAM FACE INCIDENCIAS ERROR:", err);
      setError(err?.message || "No fue posible cargar las incidencias.");
    } finally {
      setCargando(false);
    }
  }, [sesion.empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const limpiar = () => {
    setEditandoId(null);
    setEmpleadoId("");
    setTipo("VACACIONES");
    setFechaInicio(hoy);
    setFechaFin(hoy);
    setUsarHoras(false);
    setHoraInicio("08:00");
    setHoraFin("17:00");
    setMotivo("");
    setObservacion("");
    setEstado("PENDIENTE");
  };

  const editar = (x: any) => {
    setEditandoId(x.id);
    setEmpleadoId(x.empleado_id || "");
    setTipo(x.tipo || "VACACIONES");
    setFechaInicio(x.fecha_inicio || hoy);
    setFechaFin(x.fecha_fin || x.fecha_inicio || hoy);
    setUsarHoras(Boolean(x.hora_inicio || x.hora_fin));
    setHoraInicio(String(x.hora_inicio || "08:00").slice(0, 5));
    setHoraFin(String(x.hora_fin || "17:00").slice(0, 5));
    setMotivo(x.motivo || "");
    setObservacion(x.observacion || "");
    setEstado(x.estado || "PENDIENTE");
    setMostrarForm(true);
    setMensaje("");
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoId || !fechaInicio || !fechaFin) return;

    if (fechaFin < fechaInicio) {
      setError("La fecha final no puede ser anterior a la fecha inicial.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;

      const payload: any = {
        empresa_id: sesion.empresaId,
        empleado_id: empleadoId,
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        hora_inicio: usarHoras ? horaInicio : null,
        hora_fin: usarHoras ? horaFin : null,
        motivo: motivo.trim() || null,
        observacion: observacion.trim() || null,
        estado,
        updated_at: new Date().toISOString(),
      };

      if (!editandoId) {
        payload.creado_por = uid;
      }

      if (estado === "APROBADA") {
        payload.aprobado_por = uid;
        payload.aprobado_at = new Date().toISOString();
      } else {
        payload.aprobado_por = null;
        payload.aprobado_at = null;
      }

      if (editandoId) {
        const { error } = await supabase
          .from("incidencias")
          .update(payload)
          .eq("id", editandoId)
          .eq("empresa_id", sesion.empresaId);
        if (error) throw error;
        setMensaje("Incidencia actualizada correctamente.");
      } else {
        const { error } = await supabase.from("incidencias").insert(payload);
        if (error) throw error;
        setMensaje("Incidencia registrada correctamente.");
      }

      setMostrarForm(false);
      limpiar();
      await cargar();
    } catch (err: any) {
      setError(err?.message || "No fue posible guardar la incidencia.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (x: any, nuevoEstado: string) => {
    setError("");
    setMensaje("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id || null;

      const payload: any = {
        estado: nuevoEstado,
        updated_at: new Date().toISOString(),
        aprobado_por: nuevoEstado === "APROBADA" ? uid : null,
        aprobado_at:
          nuevoEstado === "APROBADA" ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from("incidencias")
        .update(payload)
        .eq("id", x.id)
        .eq("empresa_id", sesion.empresaId);

      if (error) throw error;

      setMensaje(
        nuevoEstado === "APROBADA"
          ? "Incidencia aprobada."
          : "Incidencia actualizada."
      );
      await cargar();
    } catch (err: any) {
      setError(err?.message || "No fue posible actualizar la incidencia.");
    }
  };

  const empleadoNombre = (id: string) => {
    const e = empleadosInc.find((x) => x.id === id);
    return e
      ? `${e.nombres || ""} ${e.apellidos || ""}`.trim()
      : "Empleado";
  };

  const empleadoCodigo = (id: string) =>
    empleadosInc.find((x) => x.id === id)?.codigo_empleado || "";

  const tipoBonito = (v: string) =>
    ({
      VACACIONES: "Vacaciones",
      PERMISO: "Permiso",
      LICENCIA_MEDICA: "Licencia médica",
      AUSENCIA_JUSTIFICADA: "Ausencia justificada",
    } as Record<string, string>)[v] || v;

  const campo: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    marginTop: 6,
  };

  return (
    <Layout>
      <Cabecera subtitulo="Permisos, vacaciones y licencias" />
      <button onClick={volver} style={styles.botonVolver}>← Volver</button>

      <section style={{ marginTop: 24 }}>
        <div style={styles.etiqueta}>Incidencias</div>
        <h1 style={styles.tituloDashboard}>Gestión de incidencias</h1>
        <p style={styles.descripcion}>
          Registra y aprueba novedades que afectan la asistencia de los empleados.
        </p>
      </section>

      {error && (
        <div style={{
          padding:14,borderRadius:14,marginTop:14,
          background:"#fff7ed",border:"1px solid #fed7aa",color:"#9a3412"
        }}>{error}</div>
      )}

      {mensaje && (
        <div style={{
          padding:14,borderRadius:14,marginTop:14,
          background:"#ecfdf5",border:"1px solid #a7f3d0",color:"#047857"
        }}>{mensaje}</div>
      )}

      <div style={{ margin:"18px 0" }}>
        <button
          onClick={() => {
            limpiar();
            setMostrarForm(true);
          }}
          style={{
            border:0,borderRadius:12,padding:"12px 16px",
            background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"
          }}
        >
          + Nueva incidencia
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} style={{
          background:"#fff",border:"1px solid #e5e7eb",
          borderRadius:18,padding:16,marginBottom:20
        }}>
          <h3 style={{marginTop:0}}>
            {editandoId ? "Editar incidencia" : "Nueva incidencia"}
          </h3>

          <label style={{fontSize:12,fontWeight:700}}>
            Empleado
            <select
              value={empleadoId}
              onChange={(e)=>setEmpleadoId(e.target.value)}
              style={campo}
              required
            >
              <option value="">Seleccionar…</option>
              {empleadosInc.map((e:any)=>(
                <option key={e.id} value={e.id}>
                  {e.codigo_empleado} · {e.nombres} {e.apellidos}
                </option>
              ))}
            </select>
          </label>

          <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>
            Tipo
            <select value={tipo} onChange={(e)=>setTipo(e.target.value)} style={campo}>
              <option value="VACACIONES">Vacaciones</option>
              <option value="PERMISO">Permiso</option>
              <option value="LICENCIA_MEDICA">Licencia médica</option>
              <option value="AUSENCIA_JUSTIFICADA">Ausencia justificada</option>
            </select>
          </label>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            <label style={{fontSize:12,fontWeight:700}}>
              Desde
              <input type="date" value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} style={campo} required />
            </label>
            <label style={{fontSize:12,fontWeight:700}}>
              Hasta
              <input type="date" value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} style={campo} required />
            </label>
          </div>

          <label style={{display:"block",marginTop:14,fontSize:12,fontWeight:700}}>
            <input
              type="checkbox"
              checked={usarHoras}
              onChange={(e)=>setUsarHoras(e.target.checked)}
            /> Incidencia por horas
          </label>

          {usarHoras && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
              <label style={{fontSize:12,fontWeight:700}}>
                Hora inicio
                <input type="time" value={horaInicio} onChange={(e)=>setHoraInicio(e.target.value)} style={campo} />
              </label>
              <label style={{fontSize:12,fontWeight:700}}>
                Hora fin
                <input type="time" value={horaFin} onChange={(e)=>setHoraFin(e.target.value)} style={campo} />
              </label>
            </div>
          )}

          <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>
            Motivo
            <textarea
              value={motivo}
              onChange={(e)=>setMotivo(e.target.value)}
              style={{...campo,minHeight:75,resize:"vertical"}}
            />
          </label>

          <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>
            Observación
            <textarea
              value={observacion}
              onChange={(e)=>setObservacion(e.target.value)}
              style={{...campo,minHeight:65,resize:"vertical"}}
            />
          </label>

          <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>
            Estado
            <select value={estado} onChange={(e)=>setEstado(e.target.value)} style={campo}>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="APROBADA">APROBADA</option>
              <option value="RECHAZADA">RECHAZADA</option>
            </select>
          </label>

          <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
            <button disabled={guardando} style={{
              border:0,borderRadius:12,padding:"11px 16px",
              background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"
            }}>
              {guardando ? "Guardando…" : "Guardar incidencia"}
            </button>
            <button
              type="button"
              onClick={()=>setMostrarForm(false)}
              style={{
                border:"1px solid #cbd5e1",borderRadius:12,padding:"11px 16px",
                background:"#fff",fontWeight:700,cursor:"pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <TituloSeccion texto="Incidencias registradas" />

      {cargando ? (
        <div style={{padding:18,color:"#64748b"}}>Cargando…</div>
      ) : (
        <section style={{display:"grid",gap:12,marginBottom:24}}>
          {incidencias.length === 0 && (
            <div style={{
              padding:18,background:"#fff",border:"1px solid #e5e7eb",
              borderRadius:18,color:"#64748b"
            }}>
              No hay incidencias registradas.
            </div>
          )}

          {incidencias.map((x:any)=>(
            <article key={x.id} style={{
              background:"#fff",border:"1px solid #e5e7eb",
              borderRadius:18,padding:16
            }}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontWeight:800,color:"#0f172a"}}>
                    {empleadoNombre(x.empleado_id)}
                  </div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:3}}>
                    {empleadoCodigo(x.empleado_id)}
                  </div>
                </div>

                <span style={{
                  fontSize:11,fontWeight:800,padding:"6px 9px",
                  borderRadius:999,height:"fit-content",
                  background:
                    x.estado==="APROBADA" ? "#ecfdf5" :
                    x.estado==="RECHAZADA" ? "#fef2f2" : "#fff7ed",
                  color:
                    x.estado==="APROBADA" ? "#047857" :
                    x.estado==="RECHAZADA" ? "#b91c1c" : "#9a3412"
                }}>
                  {x.estado}
                </span>
              </div>

              <div style={{fontWeight:800,color:"#334155",marginTop:10}}>
                {tipoBonito(x.tipo)}
              </div>

              <div style={{fontSize:12,color:"#475569",marginTop:5}}>
                {x.fecha_inicio}
                {x.fecha_fin && x.fecha_fin !== x.fecha_inicio ? ` → ${x.fecha_fin}` : ""}
                {x.hora_inicio ? ` · ${String(x.hora_inicio).slice(0,5)}` : ""}
                {x.hora_fin ? ` – ${String(x.hora_fin).slice(0,5)}` : ""}
              </div>

              {x.motivo && (
                <div style={{fontSize:12,color:"#475569",marginTop:8}}>
                  {x.motivo}
                </div>
              )}

              <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
                <button onClick={()=>editar(x)} style={{
                  border:"1px solid #cbd5e1",background:"#fff",
                  borderRadius:10,padding:"8px 11px",fontWeight:700,cursor:"pointer"
                }}>
                  Editar
                </button>

                {x.estado !== "APROBADA" && (
                  <button onClick={()=>cambiarEstado(x,"APROBADA")} style={{
                    border:0,background:"#0f766e",color:"#fff",
                    borderRadius:10,padding:"8px 11px",fontWeight:700,cursor:"pointer"
                  }}>
                    Aprobar
                  </button>
                )}

                {x.estado !== "RECHAZADA" && (
                  <button onClick={()=>cambiarEstado(x,"RECHAZADA")} style={{
                    border:"1px solid #fecaca",background:"#fff",
                    color:"#b91c1c",borderRadius:10,padding:"8px 11px",
                    fontWeight:700,cursor:"pointer"
                  }}>
                    Rechazar
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <Pie />
    </Layout>
  );
}

/* =========================================================
   HORARIOS Y ASIGNACIONES
========================================================= */

function PantallaHorarios({
  sesion,
  volver,
}: {
  sesion: SesionEmpresa;
  volver: () => void;
}) {
  const [horarios, setHorarios] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [empleadosHorario, setEmpleadosHorario] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarHorario, setMostrarHorario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [horaEntrada, setHoraEntrada] = useState("08:00");
  const [horaSalida, setHoraSalida] = useState("17:00");
  const [gracia, setGracia] = useState("10");
  const [descanso, setDescanso] = useState("60");
  const [cruzaMedianoche, setCruzaMedianoche] = useState(false);
  const [estadoHorario, setEstadoHorario] = useState("ACTIVO");

  const [mostrarAsignacion, setMostrarAsignacion] = useState(false);
  const [empleadoId, setEmpleadoId] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaFin, setFechaFin] = useState("");
  const [dias, setDias] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  });

  const cargarTodo = React.useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [h, a, e] = await Promise.all([
        supabase
          .from("horarios")
          .select("*")
          .eq("empresa_id", sesion.empresaId)
          .order("nombre"),
        supabase
          .from("empleado_horarios")
          .select("*")
          .eq("empresa_id", sesion.empresaId)
          .order("fecha_inicio", { ascending: false }),
        supabase
          .from("empleados")
          .select("id,codigo_empleado,nombres,apellidos,estado")
          .eq("empresa_id", sesion.empresaId)
          .eq("estado", "ACTIVO")
          .order("nombres"),
      ]);

      if (h.error) throw h.error;
      if (a.error) throw a.error;
      if (e.error) throw e.error;

      setHorarios(h.data || []);
      setAsignaciones(a.data || []);
      setEmpleadosHorario(e.data || []);
    } catch (err: any) {
      console.error("VAM FACE HORARIOS ERROR:", err);
      setError(err?.message || "No fue posible cargar los horarios.");
    } finally {
      setCargando(false);
    }
  }, [sesion.empresaId]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const limpiarHorario = () => {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
    setHoraEntrada("08:00");
    setHoraSalida("17:00");
    setGracia("10");
    setDescanso("60");
    setCruzaMedianoche(false);
    setEstadoHorario("ACTIVO");
  };

  const editarHorario = (h: any) => {
    setEditandoId(h.id);
    setNombre(h.nombre || "");
    setDescripcion(h.descripcion || "");
    setHoraEntrada(String(h.hora_entrada || "08:00").slice(0, 5));
    setHoraSalida(String(h.hora_salida || "17:00").slice(0, 5));
    setGracia(String(h.minutos_gracia ?? 0));
    setDescanso(String(h.minutos_descanso ?? 0));
    setCruzaMedianoche(Boolean(h.cruza_medianoche));
    setEstadoHorario(h.estado || "ACTIVO");
    setMostrarHorario(true);
    setMensaje("");
  };

  const guardarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    const payload = {
      empresa_id: sesion.empresaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      hora_entrada: horaEntrada,
      hora_salida: horaSalida,
      minutos_gracia: Number(gracia || 0),
      minutos_descanso: Number(descanso || 0),
      cruza_medianoche: cruzaMedianoche,
      estado: estadoHorario,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editandoId) {
        const { error } = await supabase
          .from("horarios")
          .update(payload)
          .eq("id", editandoId)
          .eq("empresa_id", sesion.empresaId);
        if (error) throw error;
        setMensaje("Horario actualizado correctamente.");
      } else {
        const { error } = await supabase.from("horarios").insert(payload);
        if (error) throw error;
        setMensaje("Horario creado correctamente.");
      }

      setMostrarHorario(false);
      limpiarHorario();
      await cargarTodo();
    } catch (err: any) {
      setError(err?.message || "No fue posible guardar el horario.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empleadoId || !horarioId || !fechaInicio) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const { error } = await supabase.from("empleado_horarios").insert({
        empresa_id: sesion.empresaId,
        empleado_id: empleadoId,
        horario_id: horarioId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || null,
        ...dias,
        estado: "ACTIVO",
      });

      if (error) throw error;

      setMensaje("Horario asignado correctamente.");
      setMostrarAsignacion(false);
      setEmpleadoId("");
      setHorarioId("");
      setFechaFin("");
      await cargarTodo();
    } catch (err: any) {
      setError(err?.message || "No fue posible asignar el horario.");
    } finally {
      setGuardando(false);
    }
  };

  const nombreEmpleado = (id: string) => {
    const e = empleadosHorario.find((x) => x.id === id);
    return e
      ? `${e.nombres || ""} ${e.apellidos || ""}`.trim()
      : "Empleado";
  };

  const nombreHorario = (id: string) =>
    horarios.find((x) => x.id === id)?.nombre || "Horario";

  const diasTexto = (a: any) => {
    const mapa = [
      ["lunes", "L"],
      ["martes", "M"],
      ["miercoles", "X"],
      ["jueves", "J"],
      ["viernes", "V"],
      ["sabado", "S"],
      ["domingo", "D"],
    ];
    return mapa.filter(([k]) => a[k]).map(([, v]) => v).join(" · ") || "Sin días";
  };

  const campo: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    marginTop: 6,
  };

  return (
    <Layout>
      <Cabecera subtitulo="Jornadas y asignaciones" />
      <button onClick={volver} style={styles.botonVolver}>← Volver</button>

      <section style={{ marginTop: 24 }}>
        <div style={styles.etiqueta}>Horarios</div>
        <h1 style={styles.tituloDashboard}>Horarios de trabajo</h1>
        <p style={styles.descripcion}>
          Crea jornadas y asígnalas a los empleados por días de la semana.
        </p>
      </section>

      {error && (
        <div style={{
          padding: 14, borderRadius: 14, marginTop: 14,
          background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412"
        }}>
          {error}
        </div>
      )}

      {mensaje && (
        <div style={{
          padding: 14, borderRadius: 14, marginTop: 14,
          background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857"
        }}>
          {mensaje}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, margin: "18px 0", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            limpiarHorario();
            setMostrarHorario(true);
            setMostrarAsignacion(false);
          }}
          style={{
            border: 0, borderRadius: 12, padding: "12px 16px",
            background: "#0f766e", color: "#fff", fontWeight: 800, cursor: "pointer"
          }}
        >
          + Nuevo horario
        </button>

        <button
          onClick={() => {
            setMostrarAsignacion(true);
            setMostrarHorario(false);
          }}
          style={{
            border: "1px solid #cbd5e1", borderRadius: 12, padding: "12px 16px",
            background: "#fff", color: "#0f172a", fontWeight: 800, cursor: "pointer"
          }}
        >
          + Asignar a empleado
        </button>
      </div>

      {mostrarHorario && (
        <form onSubmit={guardarHorario} style={{
          background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 18, padding: 16, marginBottom: 20
        }}>
          <h3 style={{ marginTop: 0 }}>
            {editandoId ? "Editar horario" : "Nuevo horario"}
          </h3>

          <label style={{ fontSize: 12, fontWeight: 700 }}>
            Nombre
            <input value={nombre} onChange={(e)=>setNombre(e.target.value)} style={campo} required />
          </label>

          <label style={{ fontSize: 12, fontWeight: 700, display:"block", marginTop:12 }}>
            Descripción
            <input value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} style={campo} />
          </label>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
            <label style={{ fontSize:12, fontWeight:700 }}>
              Entrada
              <input type="time" value={horaEntrada} onChange={(e)=>setHoraEntrada(e.target.value)} style={campo} required />
            </label>
            <label style={{ fontSize:12, fontWeight:700 }}>
              Salida
              <input type="time" value={horaSalida} onChange={(e)=>setHoraSalida(e.target.value)} style={campo} required />
            </label>
            <label style={{ fontSize:12, fontWeight:700 }}>
              Gracia (min)
              <input type="number" min="0" value={gracia} onChange={(e)=>setGracia(e.target.value)} style={campo} />
            </label>
            <label style={{ fontSize:12, fontWeight:700 }}>
              Descanso (min)
              <input type="number" min="0" value={descanso} onChange={(e)=>setDescanso(e.target.value)} style={campo} />
            </label>
          </div>

          <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginTop:14 }}>
            <label style={{ fontSize:12, fontWeight:700 }}>
              <input type="checkbox" checked={cruzaMedianoche} onChange={(e)=>setCruzaMedianoche(e.target.checked)} /> Cruza medianoche
            </label>
            <select value={estadoHorario} onChange={(e)=>setEstadoHorario(e.target.value)} style={{...campo,width:"auto",marginTop:0}}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button disabled={guardando} style={{
              border:0, borderRadius:12, padding:"11px 16px",
              background:"#0f766e", color:"#fff", fontWeight:800, cursor:"pointer"
            }}>
              {guardando ? "Guardando…" : "Guardar horario"}
            </button>
            <button type="button" onClick={()=>setMostrarHorario(false)} style={{
              border:"1px solid #cbd5e1", borderRadius:12, padding:"11px 16px",
              background:"#fff", fontWeight:700, cursor:"pointer"
            }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mostrarAsignacion && (
        <form onSubmit={guardarAsignacion} style={{
          background:"#fff", border:"1px solid #e5e7eb",
          borderRadius:18, padding:16, marginBottom:20
        }}>
          <h3 style={{ marginTop:0 }}>Asignar horario</h3>

          <label style={{fontSize:12,fontWeight:700}}>
            Empleado
            <select value={empleadoId} onChange={(e)=>setEmpleadoId(e.target.value)} style={campo} required>
              <option value="">Seleccionar…</option>
              {empleadosHorario.map((e:any)=>(
                <option key={e.id} value={e.id}>
                  {e.codigo_empleado} · {e.nombres} {e.apellidos}
                </option>
              ))}
            </select>
          </label>

          <label style={{fontSize:12,fontWeight:700,display:"block",marginTop:12}}>
            Horario
            <select value={horarioId} onChange={(e)=>setHorarioId(e.target.value)} style={campo} required>
              <option value="">Seleccionar…</option>
              {horarios.filter((h:any)=>h.estado==="ACTIVO").map((h:any)=>(
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </select>
          </label>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
            <label style={{fontSize:12,fontWeight:700}}>
              Desde
              <input type="date" value={fechaInicio} onChange={(e)=>setFechaInicio(e.target.value)} style={campo} required />
            </label>
            <label style={{fontSize:12,fontWeight:700}}>
              Hasta (opcional)
              <input type="date" value={fechaFin} onChange={(e)=>setFechaFin(e.target.value)} style={campo} />
            </label>
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
            {[
              ["lunes","Lun"],["martes","Mar"],["miercoles","Mié"],
              ["jueves","Jue"],["viernes","Vie"],["sabado","Sáb"],["domingo","Dom"]
            ].map(([key,label])=>(
              <label key={key} style={{
                padding:"8px 10px",border:"1px solid #cbd5e1",
                borderRadius:10,fontSize:12,fontWeight:700
              }}>
                <input
                  type="checkbox"
                  checked={(dias as any)[key]}
                  onChange={(e)=>setDias({...dias,[key]:e.target.checked})}
                /> {label}
              </label>
            ))}
          </div>

          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button disabled={guardando} style={{
              border:0,borderRadius:12,padding:"11px 16px",
              background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"
            }}>
              {guardando ? "Asignando…" : "Guardar asignación"}
            </button>
            <button type="button" onClick={()=>setMostrarAsignacion(false)} style={{
              border:"1px solid #cbd5e1",borderRadius:12,padding:"11px 16px",
              background:"#fff",fontWeight:700,cursor:"pointer"
            }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <TituloSeccion texto="Horarios registrados" />

      {cargando ? (
        <div style={{padding:18,color:"#64748b"}}>Cargando…</div>
      ) : (
        <section style={{display:"grid",gap:12}}>
          {horarios.map((h:any)=>(
            <article key={h.id} style={{
              background:"#fff",border:"1px solid #e5e7eb",
              borderRadius:18,padding:16
            }}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <div>
                  <div style={{fontWeight:800,color:"#0f172a"}}>{h.nombre}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:4}}>
                    {String(h.hora_entrada).slice(0,5)} – {String(h.hora_salida).slice(0,5)}
                    {" · "}{h.minutos_gracia ?? 0} min gracia
                    {" · "}{h.minutos_descanso ?? 0} min descanso
                  </div>
                </div>
                <span style={{
                  fontSize:11,fontWeight:800,padding:"6px 9px",borderRadius:999,
                  background:h.estado==="ACTIVO"?"#ecfdf5":"#f1f5f9",
                  color:h.estado==="ACTIVO"?"#047857":"#64748b",height:"fit-content"
                }}>{h.estado}</span>
              </div>
              {h.descripcion && <div style={{fontSize:12,color:"#475569",marginTop:10}}>{h.descripcion}</div>}
              <button onClick={()=>editarHorario(h)} style={{
                marginTop:12,border:"1px solid #cbd5e1",background:"#fff",
                borderRadius:10,padding:"8px 11px",fontWeight:700,cursor:"pointer"
              }}>Editar</button>
            </article>
          ))}
        </section>
      )}

      <TituloSeccion texto="Asignaciones activas" />

      <section style={{display:"grid",gap:10,marginBottom:24}}>
        {asignaciones.filter((a:any)=>a.estado==="ACTIVO").length===0 && !cargando && (
          <div style={{padding:18,background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,color:"#64748b"}}>
            No hay asignaciones activas.
          </div>
        )}

        {asignaciones.filter((a:any)=>a.estado==="ACTIVO").map((a:any)=>(
          <article key={a.id} style={{
            background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:14
          }}>
            <div style={{fontWeight:800,color:"#0f172a"}}>{nombreEmpleado(a.empleado_id)}</div>
            <div style={{fontSize:12,color:"#475569",marginTop:4}}>
              {nombreHorario(a.horario_id)} · {diasTexto(a)}
            </div>
            <div style={{fontSize:11,color:"#64748b",marginTop:5}}>
              Desde {a.fecha_inicio}{a.fecha_fin ? ` hasta ${a.fecha_fin}` : " · sin fecha final"}
            </div>
          </article>
        ))}
      </section>

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
  cargando,
  errorCarga,
  nuevoEmpleado,
  verEmpleado,
}: {
  volver: () => void;
  empleados: Empleado[];
  cargando: boolean;
  errorCarga: string;
  nuevoEmpleado: () => void;
  verEmpleado: (empleado: Empleado) => void;
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

      {cargando && (
        <div style={styles.mensajeInfo}>Cargando empleados desde Supabase...</div>
      )}

      {errorCarga && <div style={styles.error}>{errorCarga}</div>}

      <section style={styles.listaEmpleados}>
        {!cargando && empleadosFiltrados.map((empleado) => (
          <EmpleadoCard
            key={empleado.id}
            empleado={empleado}
            onClick={() => verEmpleado(empleado)}
          />
        ))}

        {!cargando && empleadosFiltrados.length === 0 && !errorCarga && (
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
  sesion,
  cancelar,
  guardado,
}: {
  sesion: SesionEmpresa;
  cancelar: () => void;
  guardado: () => Promise<void>;
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
  const [guardando, setGuardando] = useState(false);

  const guardarEmpleado = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!codigo.trim() || !nombres.trim() || !apellidos.trim() || !cargo.trim() || !fechaIngreso) {
      setError("Completa los campos obligatorios: código, nombres, apellidos, cargo y fecha de ingreso.");
      return;
    }

    setGuardando(true);

    const { error: insertError } = await supabase
      .from("empleados")
      .insert({
        empresa_id: sesion.empresaId,
        sucursal_id: "3656fc81-b835-4493-91e4-1360ad247665",
        departamento_id: "af603ad8-a0b0-4c65-afc2-deec1b164789",
        codigo_empleado: codigo.trim().toUpperCase(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        documento_identidad: documento.trim() || null,
        email: correo.trim() || null,
        telefono: telefono.trim() || null,
        cargo: cargo.trim(),
        fecha_ingreso: fechaIngreso,
        estado,
        biometria_registrada: false,
      });

    if (insertError) {
      console.error("VAM FACE NUEVO EMPLEADO ERROR:", insertError);
      setError(`No fue posible guardar el empleado: ${insertError.message}`);
      setGuardando(false);
      return;
    }

    await guardado();
    setGuardando(false);
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

        <button
          type="submit"
          disabled={guardando}
          style={{ ...styles.botonPrincipal, opacity: guardando ? 0.6 : 1 }}
        >
          {guardando ? "Guardando..." : "Guardar empleado"}
        </button>
        <button
          type="button"
          onClick={cancelar}
          disabled={guardando}
          style={styles.botonCancelar}
        >
          Cancelar
        </button>
      </form>

      <Pie />
    </Layout>
  );
}

function PantallaEditarEmpleado({
  sesion,
  empleado,
  cancelar,
  guardado,
}: {
  sesion: SesionEmpresa;
  empleado: Empleado;
  cancelar: () => void;
  guardado: (empleadoActualizado: Empleado) => Promise<void>;
}) {
  const [codigo, setCodigo] = useState(empleado.codigo);
  const [nombres, setNombres] = useState(empleado.nombres);
  const [apellidos, setApellidos] = useState(empleado.apellidos);
  const [documento, setDocumento] = useState(empleado.documento || "");
  const [telefono, setTelefono] = useState(empleado.telefono || "");
  const [correo, setCorreo] = useState(empleado.correo || "");
  const [cargo, setCargo] = useState(empleado.cargo);
  const [fechaIngreso, setFechaIngreso] = useState(empleado.fechaIngreso || "");
  const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO">(empleado.estado);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const actualizarEmpleado = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!codigo.trim() || !nombres.trim() || !apellidos.trim() || !cargo.trim() || !fechaIngreso) {
      setError("Completa los campos obligatorios: código, nombres, apellidos, cargo y fecha de ingreso.");
      return;
    }

    setGuardando(true);

    const { data, error: updateError } = await supabase
      .from("empleados")
      .update({
        codigo_empleado: codigo.trim().toUpperCase(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        documento_identidad: documento.trim() || null,
        email: correo.trim() || null,
        telefono: telefono.trim() || null,
        cargo: cargo.trim(),
        fecha_ingreso: fechaIngreso,
        estado,
      })
      .eq("id", empleado.id)
      .eq("empresa_id", sesion.empresaId)
      .select(`
        id,
        codigo_empleado,
        nombres,
        apellidos,
        documento_identidad,
        email,
        telefono,
        cargo,
        fecha_ingreso,
        estado,
        biometria_registrada,
        sucursales!empleados_sucursal_id_fkey(nombre),
        departamentos!empleados_departamento_id_fkey(nombre)
      `)
      .single();

    if (updateError || !data) {
      console.error("VAM FACE EDITAR EMPLEADO ERROR:", updateError);
      setError(`No fue posible actualizar el empleado: ${updateError?.message || "Sin respuesta del servidor"}`);
      setGuardando(false);
      return;
    }

    const fila: any = data;
    const actualizado: Empleado = {
      id: fila.id,
      codigo: fila.codigo_empleado,
      nombre: `${fila.nombres || ""} ${fila.apellidos || ""}`.trim(),
      nombres: fila.nombres || "",
      apellidos: fila.apellidos || "",
      cargo: fila.cargo || "",
      departamento: fila.departamentos?.nombre || "Sin departamento",
      estado: fila.estado === "INACTIVO" ? "INACTIVO" : "ACTIVO",
      biometria: Boolean(fila.biometria_registrada),
      documento: fila.documento_identidad || "",
      telefono: fila.telefono || "",
      correo: fila.email || "",
      sucursal: fila.sucursales?.nombre || "Sin sucursal",
      fechaIngreso: fila.fecha_ingreso || "",
    };

    await guardado(actualizado);
    setGuardando(false);
  };

  return (
    <Layout>
      <button onClick={cancelar} style={styles.volver}>← Ficha del empleado</button>

      <div style={{ marginTop: 20 }}>
        <Cabecera subtitulo="Editar empleado" />
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={styles.etiqueta}>Gestión de personal</div>
        <h1 style={styles.tituloDashboard}>Editar empleado</h1>
        <p style={styles.descripcion}>
          Actualiza la información registrada de {empleado.nombre}.
        </p>
      </section>

      <form onSubmit={actualizarEmpleado} style={styles.formulario}>
        <div style={styles.seccionFormulario}>Identificación</div>

        <label style={styles.label}>Código de empleado *</label>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Nombres *</label>
        <input value={nombres} onChange={(e) => setNombres(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Apellidos *</label>
        <input value={apellidos} onChange={(e) => setApellidos(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Cédula / Documento</label>
        <input value={documento} onChange={(e) => setDocumento(e.target.value)}
          style={styles.input} />

        <div style={styles.seccionFormulario}>Contacto</div>

        <label style={styles.label}>Teléfono</label>
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Correo electrónico</label>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
          style={styles.input} />

        <div style={styles.seccionFormulario}>Información laboral</div>

        <label style={styles.label}>Sucursal</label>
        <input value={empleado.sucursal || "Sin sucursal"} disabled style={styles.input} />

        <label style={styles.label}>Departamento</label>
        <input value={empleado.departamento || "Sin departamento"} disabled style={styles.input} />

        <label style={styles.label}>Cargo *</label>
        <input value={cargo} onChange={(e) => setCargo(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Fecha de ingreso *</label>
        <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)}
          style={styles.input} />

        <label style={styles.label}>Estado</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as "ACTIVO" | "INACTIVO")}
          style={styles.select}
        >
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="submit"
          disabled={guardando}
          style={{ ...styles.botonPrincipal, opacity: guardando ? 0.6 : 1 }}
        >
          {guardando ? "Guardando cambios..." : "Guardar cambios"}
        </button>

        <button
          type="button"
          onClick={cancelar}
          disabled={guardando}
          style={styles.botonCancelar}
        >
          Cancelar
        </button>
      </form>

      <Pie />
    </Layout>
  );
}

function PantallaDetalleEmpleado({
  empleado,
  volver,
  editar,
  registrarBiometria,
  verificarBiometria,
}: {
  empleado: Empleado;
  volver: () => void;
  editar: () => void;
  registrarBiometria: () => void;
  verificarBiometria: () => void;
}) {
  return (
    <Layout>
      <button onClick={volver} style={styles.volver}>← Empleados</button>

      <div style={{ marginTop: 20 }}>
        <Cabecera subtitulo="Ficha del empleado" />
      </div>

      <section style={{ marginTop: 30 }}>
        <div style={styles.etiqueta}>Gestión de personal</div>
        <h1 style={styles.tituloDashboard}>{empleado.nombre}</h1>
        <p style={styles.descripcion}>
          Información registrada del empleado en VAM FACE.
        </p>
      </section>

      <section style={styles.fichaEmpleado}>
        <div style={styles.fichaCabecera}>
          <div style={styles.avatarGrande}>
            {empleado.nombre
              .split(" ")
              .slice(0, 2)
              .map((nombre) => nombre[0])
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <div style={styles.empleadoNombre}>{empleado.nombre}</div>
            <div style={styles.empleadoCodigo}>{empleado.codigo}</div>
          </div>
          <span style={styles.estadoActivo}>{empleado.estado}</span>
        </div>

        <DatoEmpleado titulo="Cargo" valor={empleado.cargo} />
        <DatoEmpleado titulo="Departamento" valor={empleado.departamento} />
        <DatoEmpleado titulo="Sucursal" valor={empleado.sucursal || "Sin sucursal"} />
        <DatoEmpleado titulo="Cédula / Documento" valor={empleado.documento || "No registrado"} />
        <DatoEmpleado titulo="Teléfono" valor={empleado.telefono || "No registrado"} />
        <DatoEmpleado titulo="Correo electrónico" valor={empleado.correo || "No registrado"} />
        <DatoEmpleado titulo="Fecha de ingreso" valor={empleado.fechaIngreso || "No registrada"} />

        <div style={styles.linea} />
        <div style={styles.biometriaFila}>
          <span>Reconocimiento facial</span>
          <span style={empleado.biometria ? styles.biometriaOk : styles.biometriaPendiente}>
            {empleado.biometria ? "Registrado" : "Pendiente"}
          </span>
        </div>
      </section>

      <button
        onClick={editar}
        style={{ ...styles.botonPrincipal, marginTop: 20 }}
      >
        Editar empleado
      </button>

      <button
        onClick={registrarBiometria}
        style={{ ...styles.botonSecundarioVerde, marginTop: 12 }}
      >
        {empleado.biometria ? "Actualizar biometría facial" : "Registrar biometría facial"}
      </button>

      {empleado.biometria && (
        <button
          onClick={verificarBiometria}
          style={{ ...styles.botonPrincipal, marginTop: 12 }}
        >
          Verificar biometría facial
        </button>
      )}

      <div style={styles.avisoDev}>
        {empleado.biometria
          ? "Puedes actualizar la plantilla o realizar una comparación controlada contra la plantilla ACTIVA almacenada en Supabase."
          : "El registro facial valida cámara, captura y persistencia de la plantilla DEV vinculada al empleado."}
      </div>

      <Pie />
    </Layout>
  );
}

function DatoEmpleado({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div style={styles.datoEmpleado}>
      <div style={styles.textoPequeno}>{titulo}</div>
      <div style={styles.datoEmpleadoValor}>{valor}</div>
    </div>
  );
}

function EmpleadoCard({
  empleado,
  onClick,
}: {
  empleado: Empleado;
  onClick: () => void;
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
      onClick={onClick}
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
   RECONOCIMIENTO AUTOMÁTICO 1:N - DEV
========================================================= */
type Plantilla1N = {
  empleadoId: string;
  sucursalId: string | null;
  nombre: string;
  codigo: string;
  embedding: number[];
};

function PantallaReconocimiento1N({
  sesion,
  volver,
}: {
  sesion: SesionEmpresa;
  volver: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [plantillas, setPlantillas] = useState<Plantilla1N[]>([]);
  const [cargando, setCargando] = useState(true);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [estadoCamara, setEstadoCamara] = useState("Cámara detenida");
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [mejor, setMejor] = useState<{
    nombre:string;
    codigo:string;
    porcentaje:number;
    tipo?: "ENTRADA" | "SALIDA";
    hora?: string;
    marcacionId?: string;
  }|null>(null);

  React.useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      const { data, error } = await supabase
        .from("biometrias_faciales")
        .select("empleado_id,embedding,empleados!biometrias_faciales_empleado_id_fkey(codigo_empleado,nombres,apellidos,estado,sucursal_id)")
        .eq("empresa_id", sesion.empresaId)
        .eq("estado", "ACTIVA");

      if (cancelado) return;
      if (error) {
        setResultado(`No fue posible cargar las plantillas: ${error.message}`);
        setCargando(false);
        return;
      }

      const validas = (data || []).map((fila:any) => {
        const emp = Array.isArray(fila.empleados) ? fila.empleados[0] : fila.empleados;
        const vector = Array.isArray(fila.embedding) ? fila.embedding.map(Number) : [];
        if (!emp || emp.estado !== "ACTIVO" || vector.length !== 144 || vector.some((v:number)=>!Number.isFinite(v))) return null;
        return {
          empleadoId: fila.empleado_id,
          sucursalId: emp.sucursal_id || null,
          codigo: emp.codigo_empleado || "",
          nombre: `${emp.nombres || ""} ${emp.apellidos || ""}`.trim(),
          embedding: vector,
        };
      }).filter(Boolean) as Plantilla1N[];

      setPlantillas(validas);
      setResultado(`${validas.length} plantilla${validas.length===1?"":"s"} ACTIVA${validas.length===1?"":"S"} cargada${validas.length===1?"":"s"}.`);
      setCargando(false);
    };
    cargar();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [sesion.empresaId]);

  const iniciarCamara = async () => {
    setMejor(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamaraActiva(true);
      setEstadoCamara("Cámara frontal activa");
    } catch {
      setEstadoCamara("No se pudo abrir la cámara.");
    }
  };

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamaraActiva(false);
    setEstadoCamara("Cámara detenida");
  };

  const capturarVector = async (): Promise<number[]|null> => {
    const video=videoRef.current, canvas=canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return null;

    const Detector=(window as any).FaceDetector;
    if (Detector) {
      const caras=await new Detector({fastMode:true,maxDetectedFaces:2}).detect(video);
      if (caras.length!==1) {
        setResultado(caras.length===0 ? "No se detectó un rostro." : "Debe aparecer una sola persona.");
        return null;
      }
    }

    const size=96, grid=12, block=size/grid;
    canvas.width=size; canvas.height=size;
    const ctx=canvas.getContext("2d");
    if (!ctx) return null;
    ctx.save(); ctx.translate(size,0); ctx.scale(-1,1); ctx.drawImage(video,0,0,size,size); ctx.restore();
    const data=ctx.getImageData(0,0,size,size).data;
    const vector:number[]=[]; let mediaGlobal=0,totalPixeles=0;
    for(let gy=0;gy<grid;gy++) for(let gx=0;gx<grid;gx++){
      let suma=0,cantidad=0;
      for(let y=Math.floor(gy*block);y<Math.floor((gy+1)*block);y++)
        for(let x=Math.floor(gx*block);x<Math.floor((gx+1)*block);x++){
          const i=(y*size+x)*4;
          const lum=data[i]*.299+data[i+1]*.587+data[i+2]*.114;
          suma+=lum; mediaGlobal+=lum; cantidad++; totalPixeles++;
        }
      vector.push(cantidad?suma/cantidad:0);
    }
    mediaGlobal=totalPixeles?mediaGlobal/totalPixeles:0;
    const centrado=vector.map(v=>v-mediaGlobal);
    const norma=Math.sqrt(centrado.reduce((a,v)=>a+v*v,0))||1;
    return centrado.map(v=>Number((v/norma).toFixed(8)));
  };

  const similitud=(a:number[],b:number[])=>{
    let p=0,na=0,nb=0;
    for(let i=0;i<a.length;i++){p+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}
    const cos=p/((Math.sqrt(na)*Math.sqrt(nb))||1);
    return Math.max(0,Math.min(100,Math.round(((cos+1)/2)*100)));
  };

  const reconocer=async()=>{
    if(!plantillas.length) return;
    setProcesando(true);
    setMejor(null);

    try{
      const muestra=await capturarVector();
      if(!muestra) return;

      const resultados=plantillas.map(p=>({
        ...p,
        porcentaje:similitud(p.embedding,muestra)
      })).sort((a,b)=>b.porcentaje-a.porcentaje);

      const candidato=resultados[0];

      if(candidato.porcentaje < 92){
        setMejor({
          nombre:candidato.nombre,
          codigo:candidato.codigo,
          porcentaje:candidato.porcentaje
        });
        setResultado(`Rostro no identificado. Mejor coincidencia: ${candidato.porcentaje}%.`);
        return;
      }

      // Determinar ENTRADA/SALIDA usando la última marcación del empleado en el día local.
      const ahora = new Date();
      const inicioLocal = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate(),
        0, 0, 0, 0
      );
      const finLocal = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() + 1,
        0, 0, 0, 0
      );

      const { data: ultimas, error: ultimaError } = await supabase
        .from("marcaciones")
        .select("tipo,fecha_hora")
        .eq("empresa_id", sesion.empresaId)
        .eq("empleado_id", candidato.empleadoId)
        .gte("fecha_hora", inicioLocal.toISOString())
        .lt("fecha_hora", finLocal.toISOString())
        .order("fecha_hora", { ascending: false })
        .limit(1);

      if(ultimaError){
        setResultado(`Empleado identificado, pero no fue posible determinar la marcación: ${ultimaError.message}`);
        return;
      }

      const ultimoTipo = ultimas?.[0]?.tipo;
      const tipo: "ENTRADA" | "SALIDA" =
        ultimoTipo === "ENTRADA" ? "SALIDA" : "ENTRADA";

      // El RPC espera confianza numérica; enviamos 0..1.
      const confianza = candidato.porcentaje / 100;

      const { data: marcacionId, error: marcarError } = await supabase.rpc(
        "registrar_marcacion_facial_dev",
        {
          p_empresa_id: sesion.empresaId,
          p_empleado_id: candidato.empleadoId,
          p_sucursal_id: candidato.sucursalId,
          p_tipo: tipo,
          p_confianza: confianza,
          p_dispositivo_id: "44307fba-f876-492e-b68e-bdeb4cb9a6c4",
        }
      );

      if(marcarError){
        setResultado(`Identificado como ${candidato.nombre}, pero no se pudo registrar la marcación: ${marcarError.message}`);
        return;
      }

      const hora = new Intl.DateTimeFormat("es-DO", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());

      setMejor({
        nombre:candidato.nombre,
        codigo:candidato.codigo,
        porcentaje:candidato.porcentaje,
        tipo,
        hora,
        marcacionId: String(marcacionId || ""),
      });

      setResultado(`${tipo} registrada correctamente para ${candidato.nombre}.`);
    } catch(error){
      console.error("VAM FACE MARCACION ERROR:", error);
      setResultado("No fue posible completar la identificación y marcación.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <Layout>
      <button onClick={()=>{detenerCamara();volver();}} style={styles.volver}>← Dashboard</button>
      <div style={{marginTop:20}}><Cabecera subtitulo="Marcación facial 1:N" /></div>
      <section style={{marginTop:30}}>
        <div style={styles.etiqueta}>Laboratorio DEV</div>
        <h1 style={styles.tituloDashboard}>Marcación facial</h1>
        <p style={styles.descripcion}>Identifica al empleado y registra automáticamente su ENTRADA o SALIDA.</p>
      </section>
      <section style={styles.fichaEmpleado}>
        <DatoEmpleado titulo="Plantillas disponibles" valor={cargando?"Cargando...":String(plantillas.length)} />
        <DatoEmpleado titulo="Umbral DEV" valor="88%" />
      </section>
      <section style={styles.camaraCard}>
        <div style={styles.videoMarco}>
          <video ref={videoRef} playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)",display:camaraActiva?"block":"none"}} />
          {!camaraActiva && <div style={styles.camaraVacia}>◎</div>}
          <div style={styles.guiaRostro} />
        </div>
        <div style={styles.estadoCamara}>{estadoCamara}</div>
        {!camaraActiva ? (
          <button onClick={iniciarCamara} disabled={cargando||!plantillas.length} style={{...styles.botonPrincipal,opacity:cargando||!plantillas.length?.5:1}}>Activar cámara frontal</button>
        ) : <button onClick={detenerCamara} style={styles.botonCancelar}>Detener cámara</button>}
        <button onClick={reconocer} disabled={!camaraActiva||procesando||!plantillas.length} style={{...styles.botonSecundarioVerde,opacity:!camaraActiva||procesando||!plantillas.length?.5:1}}>
          {procesando?"Procesando marcación...":"Identificar y marcar"}
        </button>
      </section>
      {mejor && <div style={styles.biometriaNueva}>
        <div>
          <div style={{fontWeight:700,fontSize:13}}>
            {mejor.porcentaje>=92?mejor.nombre:"Sin identificación"}
          </div>
          <div style={styles.textoPequeno}>
            {mejor.porcentaje>=92
              ? `${mejor.codigo}${mejor.tipo ? ` · ${mejor.tipo}${mejor.hora ? ` · ${mejor.hora}` : ""}` : ""}`
              : "Mejor coincidencia DEV"}
          </div>
        </div>
        <span style={mejor.porcentaje>=92?styles.biometriaOk:styles.biometriaPendiente}>
          {mejor.tipo || `${mejor.porcentaje}%`}
        </span>
      </div>}
      {resultado && <div style={styles.mensajeInfo}>{resultado}</div>}
      <div style={styles.avisoDev}>DEV: identificación 1:N conectada a marcaciones. El motor facial visual actual sigue siendo de prueba y será sustituido antes de producción.</div>
      <canvas ref={canvasRef} style={{display:"none"}} />
      <Pie />
    </Layout>
  );
}


/* =========================================================
   VERIFICACIÓN BIOMÉTRICA 1:1 DEL EMPLEADO
   DEV: recupera la plantilla ACTIVA desde Supabase y compara
   una captura nueva con el mismo algoritmo visual 12x12.
========================================================= */

function PantallaVerificarBiometriaEmpleado({
  sesion,
  empleado,
  volver,
}: {
  sesion: SesionEmpresa;
  empleado: Empleado;
  volver: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [estadoCamara, setEstadoCamara] = useState("Cámara detenida");
  const [resultado, setResultado] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [cargandoPlantilla, setCargandoPlantilla] = useState(true);
  const [plantillaGuardada, setPlantillaGuardada] = useState<number[] | null>(null);
  const [modelo, setModelo] = useState("");
  const [versionModelo, setVersionModelo] = useState("");
  const [similitud, setSimilitud] = useState<number | null>(null);
  const UMBRAL_HUMAN = 60;

  React.useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      const { data, error } = await supabase.from("biometrias_faciales")
        .select("embedding,modelo,version_modelo,estado,created_at")
        .eq("empresa_id", sesion.empresaId)
        .eq("empleado_id", empleado.id)
        .eq("estado", "ACTIVA")
        .eq("modelo", "VAM_FACE_HUMAN_NEURAL")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelado) return;
      if (error) setResultado(`No fue posible cargar la plantilla: ${error.message}`);
      else if (!data || !Array.isArray(data.embedding)) setResultado("Este empleado debe enrolarse nuevamente con el motor neuronal.");
      else {
        setPlantillaGuardada(data.embedding.map((v:unknown)=>Number(v)));
        setModelo(data.modelo || "");
        setVersionModelo(data.version_modelo || "");
        setResultado(`Plantilla neuronal ACTIVA de ${empleado.nombre} cargada.`);
      }
      setCargandoPlantilla(false);
    };
    cargar();
    return()=>{cancelado=true;streamRef.current?.getTracks().forEach(t=>t.stop())};
  },[sesion.empresaId,empleado.id,empleado.nombre]);

  const iniciarCamara=async()=>{
    setSimilitud(null);
    try{
      await obtenerHumanVam();
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:720},height:{ideal:720}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
      setCamaraActiva(true);setEstadoCamara("Cámara frontal activa · motor neuronal listo");
    }catch(x:any){setEstadoCamara(x?.message||"No se pudo abrir la cámara.");}
  };

  const detenerCamara=()=>{
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
    setCamaraActiva(false);setEstadoCamara("Cámara detenida");
  };

  const comparar=async()=>{
    if(!plantillaGuardada||!videoRef.current)return;
    setProcesando(true);setSimilitud(null);
    try{
      const muestra=await embeddingHumanDesdeVideo(videoRef.current);
      const pct=await similitudHuman(plantillaGuardada,muestra);
      setSimilitud(pct);
      setResultado(pct>=UMBRAL_HUMAN?`Coincidencia neuronal confirmada con ${empleado.nombre}.`:`La captura no supera el umbral neuronal DEV de ${UMBRAL_HUMAN}%.`);
    }catch(x:any){setResultado(x?.message||"No fue posible completar la comparación facial.");}
    finally{setProcesando(false);}
  };

  return (
    <Layout>
      <button onClick={()=>{detenerCamara();volver();}} style={styles.volver}>← Ficha del empleado</button>
      <div style={{marginTop:20}}><Cabecera subtitulo="Verificación biométrica neuronal 1:1" /></div>
      <section style={{marginTop:30}}>
        <div style={styles.etiqueta}>Comparación neuronal DEV</div>
        <h1 style={styles.tituloDashboard}>{empleado.nombre}</h1>
        <p style={styles.descripcion}>La captura se compara con el embedding neuronal ACTIVO almacenado en Supabase.</p>
      </section>
      <section style={styles.fichaEmpleado}>
        <DatoEmpleado titulo="Plantilla almacenada" valor={cargandoPlantilla?"Cargando...":plantillaGuardada?`${plantillaGuardada.length} valores`:"No disponible"} />
        <DatoEmpleado titulo="Modelo" valor={modelo||"—"} />
        <DatoEmpleado titulo="Versión" valor={versionModelo||"—"} />
      </section>
      <section style={styles.camaraCard}>
        <div style={styles.videoMarco}>
          <video ref={videoRef} playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)",display:camaraActiva?"block":"none"}} />
          {!camaraActiva&&<div style={styles.camaraVacia}>◎</div>}
          <div style={styles.guiaRostro}/>
        </div>
        <div style={styles.estadoCamara}>{estadoCamara}</div>
        {!camaraActiva?
          <button onClick={iniciarCamara} disabled={!plantillaGuardada||cargandoPlantilla} style={{...styles.botonPrincipal,opacity:!plantillaGuardada||cargandoPlantilla?.5:1}}>Activar cámara frontal</button>:
          <button onClick={detenerCamara} style={styles.botonCancelar}>Detener cámara</button>}
        <button type="button" onClick={comparar} disabled={!camaraActiva||!plantillaGuardada||procesando} style={{...styles.botonSecundarioVerde,opacity:!camaraActiva||!plantillaGuardada||procesando?.5:1}}>
          {procesando?"Comparando…":"Comparar rostro con plantilla"}
        </button>
      </section>
      {similitud!==null&&<div style={styles.biometriaNueva}><div><div style={{fontWeight:700,fontSize:13}}>Similitud neuronal</div><div style={styles.textoPequeno}>Umbral DEV: {UMBRAL_HUMAN}%</div></div><span style={similitud>=UMBRAL_HUMAN?styles.biometriaOk:styles.biometriaPendiente}>{similitud}%</span></div>}
      {resultado&&<div style={styles.mensajeInfo}>{resultado}</div>}
      <div style={styles.avisoDev}>DEV: embedding neuronal Human. No se guarda fotografía. Liveness y antispoof activos. Pendiente para producción: protección de plantillas y autenticación segura del dispositivo.</div>
      <Pie/>
    </Layout>
  );
}


/* =========================================================
   REGISTRO BIOMÉTRICO DEL EMPLEADO
   DEV: captura local + asociación del estado al empleado.
   La plantilla visual NO se persiste en Supabase.
========================================================= */

function PantallaRegistroBiometriaEmpleado({
  sesion,
  empleado,
  cancelar,
  registrado,
}: {
  sesion: SesionEmpresa;
  empleado: Empleado;
  cancelar: () => void;
  registrado: () => Promise<void>;
}) {
  const videoRef=React.useRef<HTMLVideoElement|null>(null);
  const streamRef=React.useRef<MediaStream|null>(null);
  const [camaraActiva,setCamaraActiva]=useState(false);
  const [estadoCamara,setEstadoCamara]=useState("Cámara detenida");
  const [resultado,setResultado]=useState("");
  const [procesando,setProcesando]=useState(false);
  const [muestraLista,setMuestraLista]=useState(false);
  const [embedding,setEmbedding]=useState<number[]|null>(null);

  React.useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop())},[]);

  const iniciarCamara=async()=>{
    setResultado("");
    try{
      setEstadoCamara("Cargando motor neuronal…");
      await obtenerHumanVam();
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:720},height:{ideal:720}},audio:false});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play();}
      setCamaraActiva(true);setEstadoCamara("Cámara frontal activa · Human listo");
    }catch(x:any){setEstadoCamara(x?.message||"No se pudo abrir la cámara.");}
  };

  const detenerCamara=()=>{
    streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
    setCamaraActiva(false);setEstadoCamara("Cámara detenida");
  };

  const capturar=async()=>{
    if(!videoRef.current)return;
    setProcesando(true);setResultado("");setMuestraLista(false);setEmbedding(null);
    try{
      const vector=await embeddingHumanDesdeVideo(videoRef.current);
      setEmbedding(vector);setMuestraLista(true);
      setResultado(`Embedding neuronal de ${vector.length} valores preparado para ${empleado.nombre}.`);
    }catch(x:any){setResultado(x?.message||"No fue posible validar la captura facial.");}
    finally{setProcesando(false);}
  };

  const confirmarRegistro=async()=>{
    if(!muestraLista||!embedding){setResultado("Primero captura el rostro del empleado.");return;}
    setProcesando(true);setResultado("");

    const {error:revocarError}=await supabase.from("biometrias_faciales")
      .update({estado:"REVOCADA",updated_at:new Date().toISOString()})
      .eq("empresa_id",sesion.empresaId).eq("empleado_id",empleado.id).eq("estado","ACTIVA");
    if(revocarError){setResultado(`No fue posible preparar la actualización biométrica: ${revocarError.message}`);setProcesando(false);return;}

    const {error:biometriaError}=await supabase.from("biometrias_faciales").insert({
      empresa_id:sesion.empresaId,
      empleado_id:empleado.id,
      tipo:"FACIAL",
      embedding,
      modelo:"VAM_FACE_HUMAN_NEURAL",
      version_modelo:"3.3.6",
      estado:"ACTIVA",
    });
    if(biometriaError){setResultado(`No fue posible guardar la plantilla neuronal: ${biometriaError.message}`);setProcesando(false);return;}

    const {error:empleadoError}=await supabase.from("empleados").update({biometria_registrada:true})
      .eq("id",empleado.id).eq("empresa_id",sesion.empresaId);
    if(empleadoError){setResultado(`La plantilla fue guardada, pero no se pudo actualizar el empleado: ${empleadoError.message}`);setProcesando(false);return;}

    detenerCamara();await registrado();setProcesando(false);
  };

  return (
    <Layout>
      <button onClick={()=>{detenerCamara();cancelar();}} style={styles.volver}>← Ficha del empleado</button>
      <div style={{marginTop:20}}><Cabecera subtitulo={empleado.biometria?"Actualizar biometría neuronal":"Registro biométrico neuronal"}/></div>
      <section style={{marginTop:30}}>
        <div style={styles.etiqueta}>{empleado.biometria?"Actualización biométrica":"Empleado seleccionado"}</div>
        <h1 style={styles.tituloDashboard}>{empleado.nombre}</h1>
        <p style={styles.descripcion}>{empleado.codigo} · {empleado.cargo}</p>
      </section>
      <section style={styles.camaraCard}>
        <div style={styles.videoMarco}>
          <video ref={videoRef} playsInline muted style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)",display:camaraActiva?"block":"none"}}/>
          {!camaraActiva&&<div style={styles.camaraVacia}>◎</div>}
          <div style={styles.guiaRostro}/>
        </div>
        <div style={styles.estadoCamara}>{estadoCamara}</div>
        {!camaraActiva?<button onClick={iniciarCamara} style={styles.botonPrincipal}>Activar cámara frontal</button>:<button onClick={detenerCamara} style={styles.botonCancelar}>Detener cámara</button>}
        <button type="button" onClick={capturar} disabled={!camaraActiva||procesando} style={{...styles.botonSecundarioVerde,opacity:!camaraActiva||procesando?.5:1}}>
          {procesando?"Analizando con IA…":"Capturar rostro neuronal"}
        </button>
      </section>
      {resultado&&<div style={styles.mensajeInfo}>{resultado}</div>}
      {muestraLista&&<div style={styles.biometriaNueva}><div><div style={{fontWeight:700,fontSize:13}}>Embedding neuronal listo</div><div style={styles.textoPequeno}>{embedding?.length||0} valores · {empleado.nombre}</div></div><span style={styles.biometriaOk}>Lista</span></div>}
      <button type="button" onClick={confirmarRegistro} disabled={!muestraLista||procesando} style={{...styles.botonPrincipal,marginTop:16,opacity:!muestraLista||procesando?.5:1}}>Confirmar registro biométrico</button>
      <div style={styles.avisoDev}>DEV: se guarda únicamente el embedding neuronal generado por Human; no se guarda la fotografía. Los empleados con plantilla visual anterior deben enrolarse nuevamente.</div>
      <Pie/>
    </Layout>
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
        v0.1.30 DEV
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
      <span>v0.1.30 DEV</span>
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

  fichaEmpleado: {
    marginTop: 24,
    background: "white",
    border: "1px solid #e1e7eb",
    borderRadius: 20,
    padding: 18,
  },

  fichaCabecera: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  avatarGrande: {
    width: 58,
    height: 58,
    borderRadius: 16,
    background: "#ecfdf5",
    color: "#0f766e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
    flexShrink: 0,
  },

  datoEmpleado: {
    padding: "12px 0",
    borderTop: "1px solid #eef2f4",
  },

  datoEmpleadoValor: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: 600,
    wordBreak: "break-word",
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
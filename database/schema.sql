-- ============================================================
-- leadsGuadalupana — Esquema de Base de Datos
-- SQL Server (BankworksPhoenix)
-- ============================================================

-- Tabla: agencias
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_agencias' AND xtype='U')
CREATE TABLE lg_agencias (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(100)   NOT NULL,
    subou_ldap      NVARCHAR(100)   NOT NULL,
    config          NVARCHAR(MAX)   NULL, -- JSON: horarios, mensajes default, etc.
    activa          BIT             NOT NULL DEFAULT 1,
    zona_horaria    NVARCHAR(50)    NULL DEFAULT 'America/Guatemala',
    idioma_plantillas NVARCHAR(10)  NULL DEFAULT 'es',
    estrategia_atribucion NVARCHAR(20) NULL DEFAULT 'like',
    rol_default_sync NVARCHAR(20)   NULL DEFAULT 'agent',
    creado          DATETIME2       NOT NULL DEFAULT GETDATE(),
    actualizado     DATETIME2       NOT NULL DEFAULT GETDATE()
);

-- Tabla: usuarios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_usuarios' AND xtype='U')
CREATE TABLE lg_usuarios (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    ldap_sam        NVARCHAR(100)   NOT NULL,
    nombre          NVARCHAR(200)   NOT NULL,
    email           NVARCHAR(200)   NULL,
    agencia_id      INT             NOT NULL REFERENCES lg_agencias(id),
    rol             NVARCHAR(20)    NOT NULL DEFAULT 'agent' CHECK (rol IN ('agent','supervisor','admin','flow_admin','superadmin')),
    rol_id          INT             NOT NULL REFERENCES lg_roles(id),
    creado          DATETIME2       NOT NULL DEFAULT GETDATE(),
    actualizado     DATETIME2       NOT NULL DEFAULT GETDATE(),
    activo           BIT             NOT NULL DEFAULT 1,
    ultimo_sync      DATETIME2       NULL,
    CONSTRAINT UQ_lg_usuarios_ldap_sam UNIQUE (ldap_sam)
);

CREATE INDEX IX_lg_usuarios_agencia ON lg_usuarios(agencia_id, nombre);

-- Tabla: conversaciones
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_conversaciones' AND xtype='U')
CREATE TABLE lg_conversaciones (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    agencia_id          INT             NOT NULL REFERENCES lg_agencias(id),
    plataforma          NVARCHAR(20)    NOT NULL CHECK (plataforma IN ('whatsapp','instagram','facebook')),
    contacto_externo_id NVARCHAR(100)   NOT NULL, -- wa_id / ig_id / fb_id
    ad_id               NVARCHAR(100)   NULL,
    campaign_id         NVARCHAR(100)   NULL,
    estado              NVARCHAR(20)    NOT NULL DEFAULT 'en_espera'
                        CHECK (estado IN ('en_espera','auto_respondiendo','en_curso','cerrada')),
    flow_state          NVARCHAR(MAX)   NULL, -- JSON: estado actual del flow de auto-respuesta
    asignado_a          INT             NULL REFERENCES lg_usuarios(id),
    leido_por           INT             NULL REFERENCES lg_usuarios(id),
    ultima_lectura      DATETIME2       NULL,
    motivo_cierre       NVARCHAR(500)   NULL,
    cerrado_por         INT             NULL REFERENCES lg_usuarios(id),
    creado              DATETIME2       NOT NULL DEFAULT GETDATE(),
    actualizado         DATETIME2       NOT NULL DEFAULT GETDATE()
);

CREATE INDEX IX_lg_conversaciones_agencia ON lg_conversaciones(agencia_id, estado);
CREATE UNIQUE NONCLUSTERED INDEX IX_lg_conversaciones_activa ON lg_conversaciones(agencia_id, contacto_externo_id) WHERE estado != 'cerrada';
CREATE INDEX IX_lg_conversaciones_actualizado ON lg_conversaciones(agencia_id, actualizado DESC) WHERE estado != 'cerrada';
CREATE INDEX IX_lg_conversaciones_asignado ON lg_conversaciones(agencia_id, asignado_a) WHERE asignado_a IS NOT NULL;

-- Tabla: mensajes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_mensajes' AND xtype='U')
CREATE TABLE lg_mensajes (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    conversacion_id INT             NOT NULL REFERENCES lg_conversaciones(id),
    message_id      NVARCHAR(100)   NULL, -- ID de Meta (para idempotencia)
    [role]          NVARCHAR(10)    NOT NULL CHECK ([role] IN ('cliente','agente','bot')),
    tipo            NVARCHAR(20)    NOT NULL, -- gobernado por lg_tipos_mensaje
    contenido       NVARCHAR(MAX)   NOT NULL, -- JSON: texto, URLs, caption, etc.
    metadata        NVARCHAR(MAX)   NULL, -- JSON: ad_id, campaign_id, platform_data
    recibido        DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    procesado       BIT             NOT NULL DEFAULT 0,
    CONSTRAINT UQ_lg_mensajes_message_id UNIQUE (conversacion_id, message_id)
);

CREATE INDEX IX_lg_mensajes_conversacion ON lg_mensajes(conversacion_id, recibido);
CREATE INDEX IX_lg_mensajes_no_leidos ON lg_mensajes(conversacion_id, role, recibido);

-- Tabla: tipos de mensaje (mapeo WhatsApp -> interno)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_tipos_mensaje' AND xtype='U')
CREATE TABLE lg_tipos_mensaje (
    id              INT             IDENTITY(1,1) PRIMARY KEY,
    tipo_externo    NVARCHAR(30)    NOT NULL UNIQUE,
    tipo_interno    NVARCHAR(20)    NOT NULL,
    icono           NVARCHAR(10)    NULL,
    descripcion     NVARCHAR(100)   NULL,
    activo          BIT             NOT NULL DEFAULT 1
);

-- Tabla: calificaciones de leads
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_calificaciones' AND xtype='U')
CREATE TABLE lg_calificaciones (
    id              INT             IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(20)    NOT NULL UNIQUE,
    color_fondo     NVARCHAR(20)    NULL,
    color_texto     NVARCHAR(20)    NULL,
    orden           INT             NOT NULL DEFAULT 0,
    activo          BIT             NOT NULL DEFAULT 1
);

-- Tabla: leads
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_leads' AND xtype='U')
CREATE TABLE lg_leads (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    conversacion_id INT             NOT NULL REFERENCES lg_conversaciones(id),
    agencia_id      INT             NOT NULL REFERENCES lg_agencias(id),
    nombre          NVARCHAR(200)   NULL,
    telefono        NVARCHAR(50)    NULL,
    email           NVARCHAR(200)   NULL,
    calificacion    NVARCHAR(10)    NULL, -- gobernado por lg_calificaciones
    notas           NVARCHAR(MAX)   NULL,
    asignado_a      INT             NULL REFERENCES lg_usuarios(id),
    creado          DATETIME2       NOT NULL DEFAULT GETDATE(),
    actualizado     DATETIME2       NOT NULL DEFAULT GETDATE()
);

CREATE INDEX IX_lg_leads_agencia ON lg_leads(agencia_id, calificacion);
CREATE INDEX IX_lg_leads_conversacion ON lg_leads(conversacion_id);

-- Tabla: flows de auto-respuesta
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_flows' AND xtype='U')
CREATE TABLE lg_flows (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    agencia_id      INT             NOT NULL REFERENCES lg_agencias(id),
    nombre          NVARCHAR(200)   NOT NULL,
    activo          BIT             NOT NULL DEFAULT 0,
    [trigger]       NVARCHAR(MAX)   NOT NULL, -- JSON: keywords, regex, schedules
    pasos           NVARCHAR(MAX)   NOT NULL, -- JSON: array de pasos con acciones
    version         INT             NOT NULL DEFAULT 1,
    creado          DATETIME2       NOT NULL DEFAULT GETDATE(),
    actualizado     DATETIME2       NOT NULL DEFAULT GETDATE()
);

CREATE INDEX IX_lg_flows_agencia ON lg_flows(agencia_id, activo);

-- Tabla: contactos (datos del cliente compartidos entre conversaciones)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_contactos' AND xtype='U')
CREATE TABLE lg_contactos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    agencia_id      INT             NOT NULL REFERENCES lg_agencias(id),
    telefono        NVARCHAR(50)    NOT NULL,
    nombre          NVARCHAR(200)   NULL,
    dpi             NVARCHAR(20)    NULL,
    etiquetas       NVARCHAR(500)   NULL, -- JSON array: ["vip","credito","seguimiento"]
    notas           NVARCHAR(MAX)   NULL,
    creado          DATETIME2       NOT NULL DEFAULT GETDATE(),
    actualizado     DATETIME2       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_lg_contactos_agencia_telefono UNIQUE (agencia_id, telefono)
);

-- Tabla: configuración del sistema
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_config' AND xtype='U')
CREATE TABLE lg_config (
    id              INT             IDENTITY(1,1) PRIMARY KEY,
    clave           NVARCHAR(100)   NOT NULL UNIQUE,
    valor           NVARCHAR(500)   NOT NULL,
    descripcion     NVARCHAR(200)   NULL
);

-- Tabla: transiciones de estado permitidas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_estados_transiciones' AND xtype='U')
CREATE TABLE lg_estados_transiciones (
    id              INT             IDENTITY(1,1) PRIMARY KEY,
    estado_origen   NVARCHAR(50)    NOT NULL,
    estado_destino  NVARCHAR(50)    NOT NULL,
    evento          NVARCHAR(50)    NOT NULL,
    descripcion     NVARCHAR(200)   NULL,
    activo          BIT             NOT NULL DEFAULT 1
);

-- Tabla: roles
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_roles' AND xtype='U')
CREATE TABLE lg_roles (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(50)    NOT NULL UNIQUE,
    jerarquia       INT             NOT NULL DEFAULT 0,
    descripcion     NVARCHAR(200)   NULL,
    creado          DATETIME2       NOT NULL DEFAULT GETDATE()
);

-- Tabla: permisos
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_permisos' AND xtype='U')
CREATE TABLE lg_permisos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    codigo          NVARCHAR(50)    NOT NULL UNIQUE,
    descripcion     NVARCHAR(200)   NULL,
    creado          DATETIME2       NOT NULL DEFAULT GETDATE()
);

-- Tabla: roles_permisos (asignacion)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_roles_permisos' AND xtype='U')
CREATE TABLE lg_roles_permisos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    rol_id          INT NOT NULL REFERENCES lg_roles(id),
    permiso_id      INT NOT NULL REFERENCES lg_permisos(id),
    CONSTRAINT UQ_lg_roles_permisos UNIQUE (rol_id, permiso_id)
);

-- Tabla: cache de atribucion de anuncios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lg_ads_cache' AND xtype='U')
CREATE TABLE lg_ads_cache (
    ad_id               NVARCHAR(100)   PRIMARY KEY,
    campaign_id         NVARCHAR(100)   NOT NULL,
    campaign_name       NVARCHAR(255)   NULL,
    ad_name             NVARCHAR(255)   NULL,
    agency_id           INT             NULL,
    es_manual           BIT             NOT NULL DEFAULT 0,
    ultima_actualizacion DATETIME2      NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- leadsGuadalupana — Poblar lg_agencias y lg_usuarios
-- desde FINAREAFINANC + FINEJECUTIVOS + PermissionPolicyUser
-- Ejecutar DESPUÉS de database/schema.sql
-- ============================================================

-- ============================================================
-- 1. Agencias (desde FINAREAFINANC)
-- ============================================================
INSERT INTO lg_agencias (nombre, subou_ldap, activa)
SELECT DISTINCT
    a.FINDESAREAFIN                               AS nombre,
    a.FINDESAREAFIN                               AS subou_ldap,
    CAST(CASE WHEN a.FINESTADO = 1 THEN 1 ELSE 0 END AS BIT) AS activa
FROM BankworksPhoenix.dbo.FINAREAFINANC a
INNER JOIN BankworksPhoenix.dbo.FINEJECUTIVOS e
    ON e.FINCODAREAFIN = a.FINCODAREAFIN
    AND e.FINBLOCKED = 0
INNER JOIN BankworksPhoenix.dbo.PermissionPolicyUser u
    ON u.Oid = e.Oid
    AND u.IsActive = 1
    AND u.GCRecord IS NULL
WHERE u.UserName NOT IN (
    'Admin','adminguadalupana','Administrador','CAJEROADMIN',
    'CAJEROPRUEBA2','editor','Servicios','test','USUARIOBATCH',
    'UsuarioConnect','Visitante','emilio.colindres','AACM','CAJERO'
)
ORDER BY a.FINDESAREAFIN;

-- ============================================================
-- 2. Usuarios (desde FINEJECUTIVOS + PermissionPolicyUser)
-- ============================================================
INSERT INTO lg_usuarios (ldap_sam, nombre, email, agencia_id, rol)
SELECT
    u.UserName                                      AS ldap_sam,
    e.FINNOMBEJECUTI                                AS nombre,
    u.UserName                                      AS email,
    ag.id                                           AS agencia_id,
    'agent'                                         AS rol
FROM BankworksPhoenix.dbo.FINEJECUTIVOS e
INNER JOIN BankworksPhoenix.dbo.PermissionPolicyUser u
    ON u.Oid = e.Oid
    AND u.IsActive = 1
    AND u.GCRecord IS NULL
INNER JOIN lg_agencias ag
    ON ag.nombre = (
        SELECT a.FINDESAREAFIN
        FROM BankworksPhoenix.dbo.FINAREAFINANC a
        WHERE a.FINCODAREAFIN = e.FINCODAREAFIN
    )
WHERE e.FINBLOCKED = 0
  AND e.FINCODAREAFIN IS NOT NULL
  AND u.UserName NOT IN (
    'Admin','adminguadalupana','Administrador','CAJEROADMIN',
    'CAJEROPRUEBA2','editor','Servicios','test','USUARIOBATCH',
    'UsuarioConnect','Visitante','emilio.colindres','AACM','CAJERO'
);

-- ============================================================
-- 3. Admin de prueba (para desarrollo local)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM lg_usuarios WHERE ldap_sam = 'pgssantisteban@guadalupana.com.gt')
INSERT INTO lg_usuarios (ldap_sam, nombre, email, agencia_id, rol)
SELECT
    'pgssantisteban@guadalupana.com.gt',
    'Sergio Santisteban',
    'pgssantisteban@guadalupana.com.gt',
    id,
    'admin'
FROM lg_agencias
WHERE nombre = 'AG. CENTRAL ZONA 14';

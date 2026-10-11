================================================================================
OBJECTIVE REACHER — CREDENCIALES DE FIRMA ANDROID (.APKSIGNED / .AAB)
================================================================================

Guarda este archivo y tu archivo .keystore en un lugar seguro (Google Drive /
gestor de contraseñas). Google Play exige firmar todas las actualizaciones
futuras de com.cnf.objectiveReacher con esta misma clave.

• Package Name (ID de Aplicación): com.cnf.objectiveReacher
• Archivo Keystore (PKCS#12):      com.cnf.objectiveReacher-release.keystore
• Key Alias (Alias de la clave):   objectivereacher
• Store Password (Contraseña):     ObjReacher2026!
• Key Password (Contraseña clave): ObjReacher2026!
• Algoritmo / Validez:             RSA 2048-bit · 10.000 días (~27 años)

HUELLAS DIGITALES DEL CERTIFICADO (Digital Asset Links & Google Play):
• SHA-256:
  7E:F7:B4:06:D4:EE:06:C2:5A:0F:9E:36:B2:BD:AC:E6:55:57:35:20:E5:AF:82:66:F9:63:4D:F5:9C:2C:99:6A

• SHA-1:
  EF:D6:4B:27:27:56:07:65:0B:D9:6D:D6:6C:0D:8E:80:86:91:11:F2

--------------------------------------------------------------------------------
OPCIÓN A: GENERAR EL .APK FIRMADO EN 1 MINUTO CON PWABUILDER (SIN INSTALAR NADA)
--------------------------------------------------------------------------------
1. Entra a https://www.pwabuilder.com y pega la URL de tu app publicada.
2. Elige "Package for stores" -> "Android" -> "Other options".
3. Configura:
   - Package ID: com.cnf.objectiveReacher
   - App name: Objective Reacher
   - Signing key: "Use mine" (Usar mi propia clave)
   - Sube el archivo: com.cnf.objectiveReacher-release.keystore
   - Alias: objectivereacher
   - Keystore password / Key password: ObjReacher2026!
4. Descarga tu paquete: ya incluye el archivo .apk firmado listo para instalar
   en tu celular Android y el .aab firmado para Google Play Console.

--------------------------------------------------------------------------------
OPCIÓN B: COMPILAR LOCALMENTE CON BUBBLEWRAP CLI
--------------------------------------------------------------------------------
1. En una carpeta con twa-manifest.json y com.cnf.objectiveReacher-release.keystore:
   npx @bubblewrap/cli build
2. Cuando pida la contraseña del keystore y de la clave, ingresa:
   ObjReacher2026!
3. Obtendrás:
   - app-release-signed.apk (para instalar y probar directo en tu Android)
   - app-release-bundle.aab (para subir a Google Play Console)
================================================================================

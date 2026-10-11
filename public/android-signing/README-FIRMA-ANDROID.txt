================================================================================
OBJECTIVE REACHER — BUILDS ANDROID (RELEASE & DEBUG) + CREDENCIALES DE FIRMA
================================================================================

Guarda este archivo y tus archivos .keystore en un lugar seguro (Google Drive /
gestor de contraseñas). Google Play exige firmar todas las actualizaciones
futuras de com.cnf.objectiveReacher con la misma clave de Release.

• Package Name (ID de Aplicación): com.cnf.objectiveReacher
• Versión:                         1.0.0 (versionCode: 1)
• SDK Android:                     minSdkVersion 21 · targetSdkVersion 34

--------------------------------------------------------------------------------
1. BUILD RELEASE (PRODUCCIÓN / GOOGLE PLAY / INSTALACIÓN FINAL)
--------------------------------------------------------------------------------
• Archivo APK firmado (v1+v2+v3):  com.cnf.objectiveReacher-release-signed.apk
• Debuggable / Inspector WebView:  false (optimizado para producción)
• Archivo Keystore (PKCS#12):      com.cnf.objectiveReacher-release.keystore
• Key Alias (Alias de la clave):   objectivereacher
• Store Password (Contraseña):     ObjReacher2026!
• Key Password (Contraseña clave): ObjReacher2026!
• Algoritmo / Validez:             RSA 2048-bit · 10.000 días (~27 años)
• SHA-256 (Release):
  7E:F7:B4:06:D4:EE:06:C2:5A:0F:9E:36:B2:BD:AC:E6:55:57:35:20:E5:AF:82:66:F9:63:4D:F5:9C:2C:99:6A
• SHA-1 (Release):
  EF:D6:4B:27:27:56:07:65:0B:D9:6D:D6:6C:0D:8E:80:86:91:11:F2

--------------------------------------------------------------------------------
2. BUILD DEBUG (PRUEBAS / CHROME INSPECT / DESARROLLO)
--------------------------------------------------------------------------------
• Archivo APK Debug (v1+v2+v3):    com.cnf.objectiveReacher-debug.apk
• Debuggable / Inspector WebView:  true (permite depurar vía chrome://inspect)
• Archivo Keystore (PKCS#12):      com.cnf.objectiveReacher-debug.keystore
• Key Alias (Alias de la clave):   androiddebugkey
• Store Password (Contraseña):     android
• Key Password (Contraseña clave): android
• SHA-256 (Debug):
  2D:BD:B8:FD:DA:8D:7E:B3:B2:80:CA:A5:82:58:9D:08:85:DA:B1:24:DC:DF:97:C9:85:89:F4:C2:E3:66:A1:57
• SHA-1 (Debug):
  B5:0E:C0:D5:7A:40:5E:94:32:F3:A6:40:1F:2A:D3:7D:25:EB:70:29

Nota importante de Android: Como ambos APKs comparten el mismo Package ID
(com.cnf.objectiveReacher) pero están firmados con claves distintas (Release vs
Debug), desinstala una variante en tu teléfono antes de instalar la otra.
================================================================================

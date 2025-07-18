// auth-routes.js - Rutas de autenticación separadas
const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const dbManager = require('./db-manager');

const router = express.Router();

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
}

// ===== Rutas de autenticación =====

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Intentando login con email:', email);
    
    // Buscar usuario sin filtro de ACTIVO inicialmente para diagnóstico
    const usuario = await dbManager.get('SELECT * FROM USUARIOS WHERE EMAIL = ?', [email]);
    
    if (!usuario) {
      console.error('Usuario no encontrado:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    console.log('Usuario encontrado:', {
      id: usuario.ID,
      email: usuario.EMAIL,
      rol: usuario.ROL,
      activo: usuario.ACTIVO
    });
    
    // Verificar si el usuario está activo
    if (usuario.ACTIVO !== 1) {
      console.error('Usuario inactivo:', email);
      return res.status(401).json({ error: 'Este usuario está desactivado' });
    }
    
    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.PASSWORD);
    if (!passwordValida) {
      console.error('Contraseña incorrecta para usuario:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    console.log('Autenticación exitosa para usuario:', email);
    
    // Crear objeto de usuario sin datos sensibles
    const usuarioParaCliente = {
      ID: usuario.ID,
      NOMBRE: usuario.NOMBRE,
      EMAIL: usuario.EMAIL,
      ROL: usuario.ROL,
      ACTIVO: usuario.ACTIVO,
      FECHA_INICIO: usuario.FECHA_INICIO,
      FECHA_FINAL: usuario.FECHA_FINAL
    };
    
    // Guardar en sesión
    req.session.usuario = usuarioParaCliente;
    
    // Registrar en auditoría
    await dbManager.logAction(usuario.ID, 'iniciar_sesion', null, req.ip);
    
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuarioParaCliente
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error del servidor: ' + error.message });
  }
});

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Registrar cierre de sesión en auditoría
    await dbManager.logAction(req.session.usuario.ID, 'cerrar_sesion', null, req.ip);
    
    req.session.destroy();
    res.json({ mensaje: 'Sesión cerrada' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Buscar usuario por email
    const usuario = await dbManager.get('SELECT * FROM USUARIOS WHERE EMAIL = ? AND ACTIVO = 1', [email]);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Generar token para reset de contraseña
    const token = crypto.randomBytes(20).toString('hex');
    
    // Guardar token en la base de datos con expiración (1 hora)
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 1);
    
    await dbManager.run(
      'UPDATE USUARIOS SET RESET_TOKEN = ?, RESET_TOKEN_EXPIRA = ? WHERE ID = ?',
      [token, expiracion.toISOString(), usuario.ID]
    );
    
    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
      host: 'smtp.ejemplo.com',
      port: 587,
      secure: false,
      auth: {
        user: 'sistema@ejemplo.com',
        pass: 'contraseña'
      }
    });
    
    // Enviar correo
    await transporter.sendMail({
      from: '"Sistema de Pilonas" <sistema@ejemplo.com>',
      to: usuario.EMAIL,
      subject: 'Restablecimiento de contraseña',
      html: `
        <p>Hola ${usuario.NOMBRE},</p>
        <p>Has solicitado restablecer tu contraseña. Por favor, haz clic en el siguiente enlace:</p>
        <p><a href="https://sistema-pilonas.ejemplo.com/reset-password?token=${token}">Restablecer contraseña</a></p>
        <p>Este enlace expirará en 1 hora.</p>
      `
    });
    
    res.json({ mensaje: 'Se ha enviado un correo electrónico con instrucciones' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Cambiar Password
router.post('/cambiar-password', requireAuth, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    
    // Obtener usuario
    const usuario = await dbManager.get('SELECT * FROM USUARIOS WHERE ID = ?', [req.session.usuario.ID]);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(passwordActual, usuario.PASSWORD);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    
    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(passwordNueva, 10);
    
    // Actualizar contraseña
    await dbManager.run(
      'UPDATE USUARIOS SET PASSWORD = ? WHERE ID = ?',
      [hashedPassword, usuario.ID]
    );
    
    // Registrar cambio en auditoría
    await dbManager.logAction(usuario.ID, 'cambiar_password', null, req.ip);
    
    res.json({ mensaje: 'Contraseña cambiada correctamente' });
  } catch (error) {
    console.error('Error en cambio de contraseña:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Verificar sesión actual
router.get('/session', (req, res) => {
  if (req.session.usuario) {
    res.json({
      autenticado: true,
      usuario: req.session.usuario
    });
  } else {
    res.json({
      autenticado: false
    });
  }
});

// Alias para check-session (compatibilidad)
router.get('/check-session', (req, res) => {
  if (req.session.usuario) {
    res.json({
      autenticado: true,
      usuario: {
        id: req.session.usuario.ID,
        nombre: req.session.usuario.NOMBRE,
        email: req.session.usuario.EMAIL,
        rol: req.session.usuario.ROL
      }
    });
  } else {
    res.json({ autenticado: false });
  }
});

module.exports = router;

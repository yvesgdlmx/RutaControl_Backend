import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import db, { conectarBD } from './config/db.js'
import './models/Index.js'
import authRoutes from './routes/authRoutes.js'
import choferRoutes from './routes/choferRoutes.js'
import configuracionRoutes from './routes/configuracionRoutes.js'
import destinoRoutes from './routes/destinoRoutes.js'
import geocodificacionRoutes from './routes/geocodificacionRoutes.js'
import origenRoutes from './routes/origenRoutes.js'
import pedidoRoutes from './routes/pedidoRoutes.js'
import reporteRoutes from './routes/reporteRoutes.js'
import ruteoRoutes from './routes/ruteoRoutes.js'
import rutaRoutes from './routes/rutaRoutes.js'
import seguimientoRoutes from './routes/seguimientoRoutes.js'
import tableroRoutes from './routes/tableroRoutes.js'
import usuarioRoutes from './routes/usuarioRoutes.js'
import { protegerRuta } from './middleware/authMiddleware.js'
import AuthInicialService from './services/AuthInicialService.js'
import DatosInicialesService from './services/DatosInicialesService.js'
import SeguimientoService from './services/SeguimientoService.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDistPath = path.resolve(__dirname, '../frontend/dist')

const app = express()

const corsOptions = {
  origin: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200
}

app.use((req, res, next) => {
  const origin = req.headers.origin

  if (origin) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin')
  res.header('Access-Control-Expose-Headers', 'Authorization')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  return next()
})
app.use(cors(corsOptions))
app.use(express.json())
app.use('/uploads', express.static('uploads'))

try {
  await conectarBD()
  if (process.env.DB_SYNC !== 'false') {
    await db.sync(process.env.DB_SYNC === 'alter' ? { alter: true } : {})
  }
  await AuthInicialService.asegurarAdministradorInicial()

  if (process.env.DB_SEED === 'true') {
    await DatosInicialesService.sembrarDatosIniciales()
  }
} catch (error) {
  console.log('No se pudo conectar a MySQL. El servidor seguira activo, pero la API de datos fallara hasta configurar la base.')
  console.log(error.message)
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'rutacontrol-api', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/seguimiento', seguimientoRoutes)
app.use('/api/pedidos', protegerRuta, pedidoRoutes)
app.use('/api/origenes', protegerRuta, origenRoutes)
app.use('/api/destinos', protegerRuta, destinoRoutes)
app.use('/api/geocodificacion', protegerRuta, geocodificacionRoutes)
app.use('/api/choferes', protegerRuta, choferRoutes)
app.use('/api/rutas', protegerRuta, rutaRoutes)
app.use('/api/tablero', protegerRuta, tableroRoutes)
app.use('/api/reportes', protegerRuta, reporteRoutes)
app.use('/api/ruteo', protegerRuta, ruteoRoutes)
app.use('/api/usuarios', protegerRuta, usuarioRoutes)
app.use('/api/configuracion', protegerRuta, configuracionRoutes)

app.use(express.static(frontendDistPath))

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'))
})

const PORT = process.env.PORT || 4000
const servidor = http.createServer(app)

// Socket.IO comparte el mismo servidor HTTP que Express.
// Esto permite que ngrok exponga backend, frontend y sockets con un solo puerto.
const io = new Server(servidor, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
})

// Guardamos io dentro de app para que los controllers puedan emitir eventos.
app.set('io', io)

// Registra los eventos admin:join, driver:join y driver:location.
SeguimientoService.configurarEventosSeguimiento(io)

function obtenerUrlsLocales(puerto) {
  const interfaces = os.networkInterfaces()
  const direcciones = []

  Object.values(interfaces).forEach((entradas = []) => {
    entradas.forEach((entrada) => {
      if (entrada.family === 'IPv4' && !entrada.internal) {
        direcciones.push(`http://${entrada.address}:${puerto}`)
      }
    })
  })

  return direcciones
}

servidor.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`)
  obtenerUrlsLocales(PORT).forEach((url) => console.log(`LAN: ${url}`))
})

app.use((err, req, res, next) => {
  console.error('Error global:', err)
  res.status(500).json({ error: err.message, stack: err.stack })
})

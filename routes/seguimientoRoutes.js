import express from 'express'
import {
  activarPedidoChofer,
  finalizarPedidoChofer,
  marcarLlegadaPedidoChofer,
  obtenerChoferesEnSeguimiento,
  obtenerPedidosChofer,
  registrarUbicacionHttp
} from '../controllers/seguimientoController.js'
import { autorizarRoles, protegerRuta } from '../middleware/authMiddleware.js'

const router = express.Router()

// Estado actual de los choferes que han reportado GPS.
router.get('/drivers', obtenerChoferesEnSeguimiento)

// Alternativa por HTTP para registrar una ubicacion sin pasar por Socket.IO.
router.post('/location', registrarUbicacionHttp)

router.get('/chofer/pedidos', protegerRuta, autorizarRoles('chofer'), obtenerPedidosChofer)
router.post('/chofer/pedidos/:id/activar', protegerRuta, autorizarRoles('chofer'), activarPedidoChofer)
router.post('/chofer/pedidos/:id/llegada', protegerRuta, autorizarRoles('chofer'), marcarLlegadaPedidoChofer)
router.post('/chofer/pedidos/:id/finalizar', protegerRuta, autorizarRoles('chofer'), finalizarPedidoChofer)

export default router

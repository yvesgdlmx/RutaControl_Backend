import express from 'express'
import {
  actualizarPedido,
  crearPedido,
  eliminarPedido,
  obtenerPedido,
  obtenerPedidos
} from '../controllers/pedidoController.js'

const router = express.Router()

router.get('/', obtenerPedidos)
router.get('/:id', obtenerPedido)
router.post('/', crearPedido)
router.put('/:id', actualizarPedido)
router.delete('/:id', eliminarPedido)

export default router

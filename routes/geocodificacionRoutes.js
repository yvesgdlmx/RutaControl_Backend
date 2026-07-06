import express from 'express'
import { buscarUbicaciones } from '../controllers/geocodificacionController.js'

const router = express.Router()

router.get('/buscar', buscarUbicaciones)

export default router

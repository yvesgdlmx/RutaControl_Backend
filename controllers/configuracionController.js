import { ConfiguracionSistema } from '../models/Index.js'
import manejarError from '../helpers/manejarError.js'

const configuracionesBase = [
  {
    clave: 'nombre_empresa',
    etiqueta: 'Nombre de empresa',
    valor: 'RutaControl',
    tipo: 'texto',
    grupo: 'general',
    descripcion: 'Nombre visible dentro del panel administrativo.'
  },
  {
    clave: 'intervalo_gps_segundos',
    etiqueta: 'Intervalo GPS',
    valor: '10',
    tipo: 'numero',
    grupo: 'seguimiento',
    descripcion: 'Segundos entre cada envio de ubicacion del chofer.'
  },
  {
    clave: 'alertas_tiempo_real',
    etiqueta: 'Alertas en tiempo real',
    valor: 'true',
    tipo: 'booleano',
    grupo: 'seguimiento',
    descripcion: 'Activa avisos operativos para cambios relevantes.'
  },
  {
    clave: 'folio_prefijo',
    etiqueta: 'Prefijo de folio',
    valor: 'RC',
    tipo: 'texto',
    grupo: 'pedidos',
    descripcion: 'Prefijo usado para generar nuevos folios de pedido.'
  }
]

const asegurarConfiguracionesBase = async () => {
  await Promise.all(
    configuracionesBase.map((configuracion) =>
      ConfiguracionSistema.findOrCreate({
        where: { clave: configuracion.clave },
        defaults: configuracion
      })
    )
  )
}

export const obtenerConfiguracion = async (req, res) => {
  try {
    await asegurarConfiguracionesBase()

    const configuraciones = await ConfiguracionSistema.findAll({
      order: [['grupo', 'ASC'], ['etiqueta', 'ASC']]
    })

    return res.json({ configuraciones })
  } catch (error) {
    return manejarError(res, error, 'No se pudo obtener la configuracion')
  }
}

export const actualizarConfiguracion = async (req, res) => {
  try {
    const configuracion = await ConfiguracionSistema.findByPk(req.params.id)

    if (!configuracion) {
      return res.status(404).json({ msg: 'Configuracion no encontrada' })
    }

    await configuracion.update({ valor: req.body.valor })
    req.app.get('io')?.to('admins').emit('configuracion:actualizada')

    return res.json({ msg: 'Configuracion actualizada correctamente', configuracion })
  } catch (error) {
    return manejarError(res, error, 'No se pudo actualizar la configuracion')
  }
}

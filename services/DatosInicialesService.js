import { Pedido, Ruta, Usuario } from '../models/Index.js'

const sembrarDatosIniciales = async () => {
  const totalUsuarios = await Usuario.count()

  if (totalUsuarios > 0) {
    return
  }

  const carlos = await Usuario.create({
    nombre: 'Carlos Medina',
    correo: 'carlos.medina@rutacontrol.local',
    telefono: '614 245 1098',
    rol: 'chofer',
    estado: 'activo',
    vehiculo: 'NP300 - RTA-204'
  })

  const luis = await Usuario.create({
    nombre: 'Luis Herrera',
    correo: 'luis.herrera@rutacontrol.local',
    telefono: '614 380 7712',
    rol: 'chofer',
    estado: 'activo',
    vehiculo: 'Hilux - RTA-118'
  })

  const pedidos = await Pedido.bulkCreate([
    {
      folio: 'RC-00081',
      descripcion: 'Compra de refacciones para tablero electrico',
      areaSolicitante: 'Mantenimiento',
      prioridad: 'Alta',
      estado: 'En camino',
      origen: 'Base Optimex Zapopan',
      destino: 'Planta Norte',
      usuarioSolicitante: 'Administrador',
      chofer_id: carlos.id
    },
    {
      folio: 'RC-00082',
      descripcion: 'Entrega de herramienta hidraulica',
      areaSolicitante: 'Almacen',
      prioridad: 'Media',
      estado: 'Asignado',
      origen: 'Base Optimex Zapopan',
      destino: 'Sucursal Centro',
      usuarioSolicitante: 'Administrador',
      chofer_id: carlos.id
    },
    {
      folio: 'RC-00083',
      descripcion: 'Recoleccion de insumos de seguridad',
      areaSolicitante: 'Compras',
      prioridad: 'Baja',
      estado: 'Pendiente',
      origen: 'Base Optimex Zapopan',
      destino: 'Proveedor Sur',
      usuarioSolicitante: 'Administrador'
    },
    {
      folio: 'RC-00079',
      descripcion: 'Entrega de materiales para cuadrilla externa',
      areaSolicitante: 'Operacion',
      prioridad: 'Alta',
      estado: 'Entregado',
      origen: 'Base Optimex Zapopan',
      destino: 'Obra Poniente',
      usuarioSolicitante: 'Administrador',
      chofer_id: luis.id
    }
  ])

  const ruta = await Ruta.create({
    codigo: 'RUTA-014',
    estado: 'Activa',
    vehiculo: 'Camioneta Nissan NP300',
    progreso: 58,
    eta: '1 h 20 min',
    fechaInicio: new Date(),
    chofer_id: carlos.id
  })

  await ruta.addPedidos(pedidos.slice(0, 2).map((pedido) => pedido.id))
}

export default {
  sembrarDatosIniciales
}

import Pedido from './Pedido.js'
import ConfiguracionSistema from './ConfiguracionSistema.js'
import Destino from './Destino.js'
import EstanciaPedido from './EstanciaPedido.js'
import Origen from './Origen.js'
import Ruta from './Ruta.js'
import RutaPedido from './RutaPedido.js'
import UbicacionChofer from './UbicacionChofer.js'
import Usuario from './Usuario.js'

Usuario.hasMany(Pedido, { foreignKey: 'chofer_id', as: 'pedidosAsignados' })
Pedido.belongsTo(Usuario, { foreignKey: 'chofer_id', as: 'chofer' })

Usuario.hasMany(Ruta, { foreignKey: 'chofer_id', as: 'rutasAsignadas' })
Ruta.belongsTo(Usuario, { foreignKey: 'chofer_id', as: 'chofer' })

Ruta.belongsToMany(Pedido, {
  through: RutaPedido,
  foreignKey: 'ruta_id',
  otherKey: 'pedido_id',
  as: 'pedidos'
})

Pedido.belongsToMany(Ruta, {
  through: RutaPedido,
  foreignKey: 'pedido_id',
  otherKey: 'ruta_id',
  as: 'rutas'
})

Usuario.hasMany(UbicacionChofer, { foreignKey: 'chofer_id', as: 'ubicaciones' })
UbicacionChofer.belongsTo(Usuario, { foreignKey: 'chofer_id', as: 'chofer' })

Ruta.hasMany(UbicacionChofer, { foreignKey: 'ruta_id', as: 'ubicaciones' })
UbicacionChofer.belongsTo(Ruta, { foreignKey: 'ruta_id', as: 'ruta' })

Pedido.hasMany(UbicacionChofer, { foreignKey: 'pedido_id', as: 'ubicaciones' })
UbicacionChofer.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' })

Usuario.hasMany(EstanciaPedido, { foreignKey: 'chofer_id', as: 'estanciasPedidos' })
EstanciaPedido.belongsTo(Usuario, { foreignKey: 'chofer_id', as: 'chofer' })

Pedido.hasMany(EstanciaPedido, { foreignKey: 'pedido_id', as: 'estancias' })
EstanciaPedido.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' })

export {
  ConfiguracionSistema,
  Destino,
  EstanciaPedido,
  Origen,
  Pedido,
  Ruta,
  RutaPedido,
  UbicacionChofer,
  Usuario
}

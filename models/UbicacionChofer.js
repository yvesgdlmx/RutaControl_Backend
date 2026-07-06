import { DataTypes } from 'sequelize'
import db from '../config/db.js'

// Cada registro representa un punto GPS recibido desde el telefono.
// No reemplaza al estado en memoria del mapa; sirve como historial persistente.
const UbicacionChofer = db.define('UbicacionChofer', {
  latitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false
  },
  longitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false
  },
  precision: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  velocidad: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  rumbo: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  // Fecha enviada por el GPS del dispositivo. La separamos de createdAt
  // porque createdAt indica cuando el backend guardo el registro.
  fechaGps: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'ubicaciones_choferes',
  underscored: true
})

export default UbicacionChofer

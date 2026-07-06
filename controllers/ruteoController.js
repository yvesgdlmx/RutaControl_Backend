const CACHE_RUTAS_MS = 2 * 60 * 1000
const cacheRutas = new Map()

const coordenadaValida = (valor, minimo, maximo) => {
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo
}

const validarPunto = (punto) => {
  if (!Array.isArray(punto) || punto.length !== 2) {
    return false
  }

  return coordenadaValida(punto[0], -90, 90) && coordenadaValida(punto[1], -180, 180)
}

const crearClaveCache = (origen, destino) => {
  const redondear = (valor) => Number(valor).toFixed(5)
  return `${redondear(origen[0])},${redondear(origen[1])}-${redondear(destino[0])},${redondear(destino[1])}`
}

const obtenerRutaCache = (clave) => {
  const registro = cacheRutas.get(clave)

  if (!registro) {
    return null
  }

  if (Date.now() - registro.fecha > CACHE_RUTAS_MS) {
    cacheRutas.delete(clave)
    return null
  }

  return registro.ruta
}

const guardarRutaCache = (clave, ruta) => {
  cacheRutas.set(clave, {
    fecha: Date.now(),
    ruta
  })
}

const convertirCoordenadasGeojson = (geometry) => {
  if (!geometry?.coordinates?.length) {
    return []
  }

  if (geometry.type === 'LineString') {
    return geometry.coordinates.map(([longitud, latitud]) => [latitud, longitud])
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates
      .flat()
      .map(([longitud, latitud]) => [latitud, longitud])
  }

  return []
}

const calcularRutaGeoapify = async (origen, destino) => {
  const [latitudOrigen, longitudOrigen] = origen
  const [latitudDestino, longitudDestino] = destino
  const parametros = new URLSearchParams({
    waypoints: `${latitudOrigen},${longitudOrigen}|${latitudDestino},${longitudDestino}`,
    mode: 'drive',
    format: 'geojson',
    apiKey: process.env.GEOAPIFY_API_KEY
  })
  const respuesta = await fetch(`https://api.geoapify.com/v1/routing?${parametros.toString()}`)
  const datos = await respuesta.json().catch(() => ({}))

  if (!respuesta.ok) {
    throw new Error(datos.message || 'No se pudo calcular la ruta con Geoapify.')
  }

  const rutaGeoapify = datos.features?.[0]
  const puntos = convertirCoordenadasGeojson(rutaGeoapify?.geometry)

  if (!puntos.length) {
    throw new Error('Geoapify no encontro una ruta disponible.')
  }

  return {
    distancia: rutaGeoapify.properties?.distance,
    duracion: rutaGeoapify.properties?.time,
    puntos,
    proveedor: 'geoapify'
  }
}

const calcularRutaConProveedorDisponible = async (origen, destino) => {
  if (process.env.GEOAPIFY_API_KEY) {
    return calcularRutaGeoapify(origen, destino)
  }

  throw new Error('Configura GEOAPIFY_API_KEY para calcular rutas sugeridas.')
}

export const obtenerRutaSugerida = async (req, res) => {
  try {
    const { origen, destino } = req.body

    if (!validarPunto(origen) || !validarPunto(destino)) {
      return res.status(400).json({ msg: 'Origen y destino deben tener coordenadas validas.' })
    }

    const claveCache = crearClaveCache(origen, destino)
    const rutaCacheada = obtenerRutaCache(claveCache)

    if (rutaCacheada) {
      return res.json({ ruta: rutaCacheada, origen: 'cache' })
    }

    const ruta = await calcularRutaConProveedorDisponible(origen, destino)

    guardarRutaCache(claveCache, ruta)

    return res.json({ ruta, origen: ruta.proveedor })
  } catch (error) {
    console.error('Error al calcular ruta sugerida:', error)
    return res.status(500).json({ msg: error.message || 'No se pudo calcular la ruta sugerida.' })
  }
}

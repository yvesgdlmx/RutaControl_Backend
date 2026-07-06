import manejarError from '../helpers/manejarError.js'

const cacheBusquedas = new Map()

const normalizarResultado = (resultado) => ({
  nombre: resultado.name || resultado.display_name?.split(',')[0] || 'Ubicacion encontrada',
  direccion: resultado.display_name,
  latitud: resultado.lat,
  longitud: resultado.lon,
  tipo: resultado.type,
  clase: resultado.class
})

export const buscarUbicaciones = async (req, res) => {
  try {
    const textoBusqueda = req.query.q?.trim()

    if (!textoBusqueda || textoBusqueda.length < 3) {
      return res.status(400).json({ msg: 'Escribe al menos 3 caracteres para buscar' })
    }

    const claveCache = textoBusqueda.toLowerCase()

    if (cacheBusquedas.has(claveCache)) {
      return res.json({ resultados: cacheBusquedas.get(claveCache) })
    }

    const parametros = new URLSearchParams({
      q: textoBusqueda,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '6',
      countrycodes: 'mx'
    })

    const controlador = new AbortController()
    const idTimeout = setTimeout(() => controlador.abort(), 8000)

    const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'es-MX,es;q=0.9',
        'User-Agent': 'RutaControl-Optimex/0.1 contacto-sistemas@optimex.local'
      },
      signal: controlador.signal
    })

    clearTimeout(idTimeout)

    if (!respuesta.ok) {
      return res.status(502).json({ msg: 'No se pudo consultar el buscador de ubicaciones' })
    }

    const datos = await respuesta.json()
    const resultados = datos.map(normalizarResultado)

    cacheBusquedas.set(claveCache, resultados)

    return res.json({ resultados })
  } catch (error) {
    return manejarError(res, error, 'No se pudo buscar la ubicacion')
  }
}

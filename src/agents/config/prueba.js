import dotenv from 'dotenv';
dotenv.config();
async function listMyModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY no está configurada.');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  console.log('Consultando la API de Google en:', url.replace(apiKey, 'TU_API_KEY_OCULTA'));

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('Error al consultar los modelos:', data);
      return;
    }

    console.log('--- Modelos Disponibles para tu API Key ---');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error de red:', error);
  }
}

listMyModels();
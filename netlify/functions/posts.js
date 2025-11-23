const { neon } = require('@netlify/neon');

const defaultLimit = 20;

exports.handler = async (event) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  try {
    const params = event.queryStringParameters || {};
    const postId = params.id ? Number(params.id) : null;
    const limit = params.limit ? Math.min(Number(params.limit), 100) : defaultLimit;

    if (postId) {
      const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
      return {
        statusCode: post ? 200 : 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post || { message: 'Post no encontrado' })
      };
    }

    const posts = await sql`SELECT * FROM posts ORDER BY id DESC LIMIT ${limit}`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: posts.length, data: posts })
    };
  } catch (error) {
    console.error('Error consultando Neon:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error interno consultando la base de datos', detail: error.message })
    };
  }
};

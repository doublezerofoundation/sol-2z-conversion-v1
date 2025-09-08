exports.handler = async (event) => {
  console.log('Event: ', JSON.stringify(event, null, 2));

  // Simple metrics response
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Metrics data retrieved successfully',
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: {
          in: Math.random() * 1000,
          out: Math.random() * 1000
        },
        timestamp: new Date().toISOString()
      }
    })
  };

  return response;
};

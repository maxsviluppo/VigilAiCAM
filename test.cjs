const importDynamic = new Function('modulePath', 'return import(modulePath)');

async function test() {
  const { GoogleGenerativeAI } = await importDynamic('@google/generative-ai');
  const ai = new GoogleGenerativeAI('AIzaSyArBmcV0kZEwFbrlyXUlHrgSybMuQYurc0');
  try {
    const res = await ai.getGenerativeModel({model: 'gemini-1.5-flash'}).generateContent('Test');
    console.log('OK', res.response.text());
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
test();

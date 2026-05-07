const { GoogleGenerativeAI } = require('@google/generative-ai');
const ai = new GoogleGenerativeAI('AIzaSyArBmcV0kZEwFbrlyXUlHrgSybMuQYurc0');
ai.getGenerativeModel({model: 'gemini-1.5-flash'}).generateContent('Test').then(res => console.log('OK')).catch(err => console.error(err.message));

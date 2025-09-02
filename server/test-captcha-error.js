/**
 * 测试验证码错误时的登录日志记录
 */
const axios = require('axios');

async function testCaptchaError() {
    try {
        console.log('获取验证码...');
        // 获取验证码
        const captchaResponse = await axios.get('http://localhost:3001/api/auth/captcha');
        const captchaId = captchaResponse.data.id;
        console.log('验证码ID:', captchaId);
        
        console.log('发送验证码错误测试...');
        // 使用错误的验证码进行登录
        const loginData = {
            username: 'admin',
            password: 'admin123',
            captchaId: captchaId,
            captchaText: 'wrong'
        };
        
        try {
            const loginResponse = await axios.post('http://localhost:3001/api/auth/login', loginData);
            console.log('登录成功:', loginResponse.data);
        } catch (error) {
            console.log('登录失败:', error.response?.status || error.message);
        }
        
        console.log('验证码错误测试完成');
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testCaptchaError();
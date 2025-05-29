import axios from 'axios';
const Login=()=>{
    const initGapi = async() => {
    console.log('Initializing Google API');
    const data=await axios.get('http://localhost:8000/auth/google');
    const authUrl = data.data.url;
    window.location.href = authUrl;
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Calendar</h2>
          <button
            onClick={initGapi}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Connect Google Calendar
          </button>
        </div>
      </div>
  );
}
export default Login;
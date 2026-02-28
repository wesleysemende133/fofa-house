import axios from "axios";

const api = axios.create({

  baseURL: "http://172.20.10.6:8080/api", 
  withCredentials: true,
});

export default api;

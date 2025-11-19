import axios from "axios";

const useAxiosCommon = () => {
  const axiosCommon = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
  });

  return axiosCommon;
};

export default useAxiosCommon;

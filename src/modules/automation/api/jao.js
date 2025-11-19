import { useApi } from "@/core/api";

export const appList = () => {
  return useApi().get('/udp/api/udp/applets/');
}

export const appTableList = (params) => {
  return useApi().get('/jao/api/jao/jobs/app', { params });
}

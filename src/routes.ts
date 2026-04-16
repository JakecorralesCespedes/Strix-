import Config from "./lib/pages/Configuration.svelte";
import Home from "./lib/pages/Home.svelte";
import Login from "./lib/pages/Login.svelte";
import Solicitudes from "./lib/pages/Solicitudes.svelte";
import HorasBeca from "./lib/pages/HorasBeca.svelte";
import Reportes from "./lib/pages/Reportes.svelte";

export type RouterType = {
  path: string;
  component: any;
  authRequired?: boolean;
};

const routes: RouterType[] = [
  {
    path: "/",
    component: Home,
    authRequired: true,
  },
  {
    path: "/configuraciones",
    component: Config,
    authRequired: true,
  },
  {
    path: "/solicitudes",
    component: Solicitudes,
    authRequired: true,
  },
  {
    path: "/horas-beca",
    component: HorasBeca,
    authRequired: true,
  },
  {
    path: "/reportes",
    component: Reportes,
    authRequired: true,
  },
  {
    path: "/login",
    component: Login,
  },
];

export default routes;

import React from 'react';

const Stacktrader = React.lazy(() => import('./views/Stacktrader'));

// https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config
const routes = [
  { path: '/stacktrader', name: 'StackTrader', component: Stacktrader },
];

export default routes;

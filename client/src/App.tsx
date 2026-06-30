import { Routes } from 'react-router-dom';
import { kernelRouteElements } from './generated/kernel-routes';

/**
 * App shell — routes unfolded from 🍁 via Red Leaf Kernel codegen.
 * @see scripts/generate-kernel-routes.js
 */
export default function App() {
  return <Routes>{kernelRouteElements}</Routes>;
}
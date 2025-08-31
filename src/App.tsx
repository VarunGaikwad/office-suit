import { Routes, Route } from "react-router-dom";
import Translate from "./pages/Translate/Translate";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Translate />} />
    </Routes>
  );
}

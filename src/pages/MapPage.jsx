import Header from "../components/Header"
import MapForm from "../components/MapForm"
import "../styles/MapPage.css"

export default function MapPage() {
  return (
    <div className="map-page">
      <Header title="Mapa - Find.Collect" />
      <div className="map-page-content">
        <h1 className="page-title">Selecione um Local</h1>
        <MapForm />
      </div>
    </div>
  )
}

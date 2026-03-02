import { useState } from "react"

function App() {
  const [query, setQuery] = useState("")
  const [generatedQuery, setGeneratedQuery] = useState("")
  const [results, setResults] = useState([])
  const [jsonData, setJsonData] = useState("")
  const [loading, setLoading] = useState(false)
  const [collectionName, setCollectionName] = useState("")
  const [selectedRows, setSelectedRows] = useState([])
  const [lastDeleted, setLastDeleted] = useState(null)
  const [darkMode, setDarkMode] = useState(true)

  const theme = {
    bg: darkMode ? "bg-[#0E1117]" : "bg-gray-100",
    card: darkMode ? "bg-[#161B22]" : "bg-white",
    border: darkMode ? "border-gray-700" : "border-gray-300",
    text: darkMode ? "text-white" : "text-black",
    input: darkMode ? "bg-[#0E1117]" : "bg-gray-50"
  }

  // =========================
  // HANDLE GENERATE (Single API Call)
  // =========================
  const handleGenerate = async () => {
    try {
      if (!query.trim()) {
        alert("Please enter a query")
        return
      }

      setLoading(true)

      const response = await fetch("https://mongodb-nli-backend.onrender.com/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || "Something went wrong")
        return
      }

      if (!data.operations || data.operations.length === 0) {
        alert("Invalid response")
        return
      }

      const operationData = data.operations[0]
      const collection = operationData.collection
      const result = operationData.result

      setCollectionName(collection || "")
      setGeneratedQuery(JSON.stringify(data.mongoQuery || {}, null, 2))

      // =========================
      // FIND
      // =========================
      if (Array.isArray(result)) {
        setResults(result)
        setJsonData(JSON.stringify(result, null, 2))
      }

      // =========================
      // INSERT
      // =========================
      else if (operationData.operation === "insert") {
        alert("Insert successful ✅")

        if (operationData.updatedData) {
          setResults(operationData.updatedData)
          setJsonData(JSON.stringify(operationData.updatedData, null, 2))
        }
      }

      // =========================
      // DELETE
      // =========================
      else if (operationData.operation === "delete") {
        alert(`${result?.deletedCount || 0} record(s) deleted ✅`)

        if (operationData.updatedData) {
          setResults(operationData.updatedData)
          setJsonData(JSON.stringify(operationData.updatedData, null, 2))
        }
      }

      // =========================
      // UPDATE
      // =========================
      else if (operationData.operation === "update") {
        alert(`${result?.modifiedCount || 0} record(s) updated ✅`)

        if (operationData.updatedData) {
          setResults(operationData.updatedData)
          setJsonData(JSON.stringify(operationData.updatedData, null, 2))
        }
      }

      // =========================
      // COUNT
      // =========================
      else if (operationData.operation === "count") {
        alert(`Total documents: ${result}`)
      }

    } catch (error) {
      console.error("Frontend Error:", error)
      alert("Server not reachable")
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // JSON EDIT HANDLER
  // =========================
  const handleJsonChange = (value) => {
    setJsonData(value)
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        setResults(parsed)
      }
    } catch {
      // ignore invalid JSON while typing
    }
  }

  const handleTableChange = (rowIndex, key, value) => {
    const updated = [...results]
    updated[rowIndex] = { ...updated[rowIndex], [key]: value }
    setResults(updated)
    setJsonData(JSON.stringify(updated, null, 2))
  }

  const handleSelectRow = (index) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(i => i !== index))
    } else {
      setSelectedRows([...selectedRows, index])
    }
  }

  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) return

    const deletedRows = results.filter((_, i) =>
      selectedRows.includes(i)
    )

    const updated = results.filter((_, i) =>
      !selectedRows.includes(i)
    )

    setLastDeleted(deletedRows)
    setResults(updated)
    setJsonData(JSON.stringify(updated, null, 2))
    setSelectedRows([])
  }

  const handleUndo = () => {
    if (!lastDeleted) return
    const restored = [...results, ...lastDeleted]
    setResults(restored)
    setJsonData(JSON.stringify(restored, null, 2))
    setLastDeleted(null)
  }

  const handleAddRow = () => {
    const newRow = {}
    if (results.length > 0) {
      Object.keys(results[0]).forEach(key => {
        newRow[key] = ""
      })
    }
    newRow._id = "temp_" + Date.now()

    const updated = [...results, newRow]
    setResults(updated)
    setJsonData(JSON.stringify(updated, null, 2))
  }

  const handleAddColumn = () => {
    const columnName = prompt("Enter new column name:")
    if (!columnName) return

    const updated = results.map(row => ({
      ...row,
      [columnName]: ""
    }))

    setResults(updated)
    setJsonData(JSON.stringify(updated, null, 2))
  }

  const handleSave = async () => {
    if (!collectionName || results.length === 0) return
    if (!window.confirm("Update database?")) return

    try {
      const response = await fetch("https://mongodb-nli-backend.onrender.com/api/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: collectionName,
          documents: results
        })
      })

      const data = await response.json()
      alert(data.success ? "Database updated ✅" : "Update failed ❌")
    } catch (error) {
      console.error(error)
    }
  }

  const allColumns = Array.from(
    new Set(
      results.flatMap(row =>
        row && typeof row === "object"
          ? Object.keys(row)
          : []
      )
    )
  ).sort((a, b) => (a === "_id" ? -1 : b === "_id" ? 1 : 0))

  return (
    <div className={`min-h-screen flex flex-col ${theme.bg} ${theme.text}`}>

      <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-green-400 flex items-center gap-3">
            <a
              href="https://www.mongodb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:opacity-80 transition"
            >
              <img
                src="https://www.mongodb.com/assets/images/global/favicon.ico"
                alt="MongoDB Logo"
                className="w-8 h-8"
              />
              <span>MongoDB NLI</span>
            </a>
          </h1>

          {/* Dark/Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-2 py-2 rounded-xl border font-semibold"
          >
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 items-stretch">

          {/* LEFT SECTION */}
          <div className={`lg:col-span-3 ${theme.card} border ${theme.border} rounded-2xl p-6 flex flex-col h-full`}>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">

              {/* Query Section */}
              <div className="flex flex-col">
                <textarea
                  className={`h-32 ${theme.input} border ${theme.border} rounded-xl p-4 mb-4 w-full`}
                  placeholder="Example : Find all users above age 25..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <button
                  onClick={handleGenerate}
                  className="bg-green-400 text-black font-semibold py-2 rounded-xl mb-4"
                >
                  {loading ? "Working..." : "Submit"}
                </button>

                <div className={`flex-1 ${theme.input} border ${theme.border} rounded-xl p-4 overflow-auto text-sm`}>
                  {results.length > 0
                    ? JSON.stringify(results, null, 2)
                    : "No results yet"}
                </div>
              </div>

              {/* TABLE SECTION */}
              <div className="flex flex-col">

                <div className="flex flex-wrap gap-3 mb-3">
                  <button onClick={handleAddRow} className="bg-blue-600 px-3 py-1 rounded-lg">➕ Row</button>
                  <button onClick={handleAddColumn} className="bg-green-600 px-3 py-1 rounded-lg">➕ Column</button>
                  <button onClick={handleDeleteSelected} className="bg-red-600 px-4 py-1 rounded-lg">🗑 Delete</button>
                  <button onClick={handleUndo} className="bg-yellow-500 text-black px-4 py-1 rounded-lg">↩ Restore</button>
                </div>

                <div className={`flex-1 ${theme.input} border ${theme.border} rounded-xl p-4 overflow-auto text-sm`}>

                  {results.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                          <thead>
                            <tr>
                              <th className={`border ${theme.border} px-2 py-1`}></th>
                              {allColumns.map(key => (
                                <th key={key} className={`border ${theme.border} px-2 py-1 text-left`}>
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {results.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td className={`border ${theme.border} px-2 py-1`}>
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.includes(rowIndex)}
                                    onChange={() => handleSelectRow(rowIndex)}
                                  />
                                </td>

                                {allColumns.map(key => (
                                  <td key={key} className={`border ${theme.border} px-2 py-1`}>
                                    <input
                                      className="w-full bg-transparent outline-none"
                                      value={row[key] ?? ""}
                                      disabled={key === "_id"}
                                      onChange={(e) =>
                                        handleTableChange(rowIndex, key, e.target.value)
                                      }
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 pt-3 border-t text-sm flex flex-wrap gap-4 justify-between">
                        <div>Total Rows: {results.length}</div>
                        <div>Selected: {selectedRows.length}</div>
                        <div>Collection: {collectionName || "None"}</div>
                      </div>

                      <button
                        onClick={handleSave}
                        className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-xl mt-4"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : "No data"}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-1 flex flex-col gap-6 h-full">

            <div className={`${theme.card} border ${theme.border} rounded-2xl p-6 flex flex-col flex-1 min-h-0`}>
              <h2 className="mb-4 font-semibold">AI Generated Query</h2>

              <textarea
                className={`flex-1 ${theme.input} border ${theme.border} rounded-xl p-4 font-mono text-sm resize-none`}
                value={generatedQuery}
                onChange={(e) => setGeneratedQuery(e.target.value)}
              />
            </div>

            <div className={`${theme.card} border ${theme.border} rounded-2xl p-6 flex flex-col flex-1 min-h-0`}>
              <h2 className="mb-4 font-semibold">JSON Format</h2>

              <textarea
                className={`flex-1 ${theme.input} border ${theme.border} rounded-xl p-4 font-mono text-sm resize-none`}
                value={jsonData}
                onChange={(e) => handleJsonChange(e.target.value)}
              />
            </div>

          </div>
        </div>
      </div>

      <footer className={`${theme.card} border-t ${theme.border} text-center py-4 text-sm`}>
        Designed by   <span className="text-blue-500 font-semibold">Abhi The Great</span>
      </footer>
    </div>
  )
}

export default App
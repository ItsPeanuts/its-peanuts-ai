from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app.mount('/static', StaticFiles(directory='frontend'), name='static')

@app.get("/")
def read_index():
    return FileResponse('frontend/index.html')

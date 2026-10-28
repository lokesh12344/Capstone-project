"""Switch caption lists from \a (text only) to \c (full caption incl. 'Fig. 1.')."""
import zipfile, shutil, sys
p = sys.argv[1]; tmp = p + ".tmp"
with zipfile.ZipFile(p) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == "word/document.xml":
            data = data.replace(b'TOC \a "', b'TOC \c "')
        zout.writestr(item, data)
shutil.move(tmp, p); print("fields fixed")

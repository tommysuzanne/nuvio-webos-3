# Optional personal thumbnails

The public source contains **no personal collection artwork**. Normal remote covers can appear without rebuilding when their host, format, size and dimensions pass the image proxy policy. Collections themselves refresh independently of the package. Unsupported, animated, oversized or blocked images can show a title-only card; this is intentional on this hardware.

For those cases, prepare static thumbnails on your Mac rather than decoding or converting large images on the TV. Use only artwork you are entitled to download and use. The code license does not license posters or studio logos.

```sh
python3 -m venv .venv
.venv/bin/pip install Pillow
.venv/bin/python scripts/prepare-uj630-artwork.py /absolute/path/to/private-collections.json --allow-download
```

The input can be your collection export or a targeted local backup containing `values.collectionsState`. The explicit flag authorizes downloads of the cover URLs in that input. The tool does not transmit account credentials or API keys. It downloads at most two images at once, checks download and pixel bounds, selects the first frame, and writes JPEGs and a local URL-hash mapping. Inspect the input URLs before using an export obtained from someone else.

To crop one folder's cover to fill a 16:9 card:

```sh
.venv/bin/python scripts/prepare-uj630-artwork.py /absolute/path/to/private-collections.json --allow-download --folder-title "My folder" --fit-cover
```

`--fit-cover` preserves proportions by cropping, not stretching. Check the result locally: a crop can remove text or logos near an edge. The `-cover.jpg` suffix opts into edge-to-edge rendering. Rebuild your private package after generating artwork.

Generated images live in ignored `assets/uj630-artwork*` directories. The generated `js/core/media/uj630Artwork.js` mapping also identifies your personal image associations, so **do not commit it**: the public check requires an empty mapping. Local preparation reports stay in ignored `evidence-uj630` and contain hashed image identifiers, not source URLs.

Runtime budgets remain 1 MiB and 1,048,576 pixels per remote image, 8 MiB for the proxy including temporary replacements, and 24-hour remote freshness. Bundled images are a fast fallback; a valid refreshed remote image may replace them. No image conversion runs on the TV.


import os, re, json
from urllib.parse import urlparse

cache_root_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "cache")
def get_cache_dir(url: str) -> str:
    url_obj = urlparse(url)
    
    pathname = os.path.join(*url_obj.path.split('/'))
    if '.' in os.path.basename(pathname):
        pathname = os.path.dirname(pathname)
    
    cache_dir = os.path.join(url_obj.netloc, pathname, '?' + url_obj.query if len(url_obj.query) > 0 else url_obj.query)
    cache_dir = re.sub(r"[/?<>:*|\"]", '_', cache_dir)
    
    return os.path.join(cache_root_path, cache_dir)
def get_file_name(url: str) -> str:
    url_obj = urlparse(url)
    file_name = os.path.basename(url_obj.path)
    
    query_string_index = file_name.find('?')
    if query_string_index != -1:
        file_name = file_name[:query_string_index]
    
    if not os.path.splitext(file_name)[1]:
        file_name += '.json'
    
    return file_name
def get_json(path: str):
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        return data
def get_json_from_url(url: str):
    return get_json(os.path.join(get_cache_dir(url), get_file_name(url)))
import os
from json import loads
from pathlib import Path
from pydriller import Repository
from Levenshtein import ratio
import gdown
from tqdm import tqdm

urls = set()
filePath = "./test.jsonl"
gdown.download(id = "1ewItOgBx0dQWUpDtpYx3wCWGvuwoJBVd", output = filePath, quiet = False)

with open(filePath, 'r') as json_file:
    json_list = list(json_file)

# test
# urls.add("https://github.com/jdaviderb/JFrogfy")
# urls.add("https://github.com/renovatebot/renovate")

for json_str in json_list:
    temp = loads(json_str)
    urls.add(temp["url"])
urls = list(urls)

def addFiles(dirPath, fileName, oldFileContent, newFileContent):
    if fileName == None or oldFileContent == None or newFileContent == None:
        return
    if (os.path.exists(dirPath) == False):
        os.makedirs(dirPath)
    fileName = dirPath + fileName
    oldFileName = fileName + ".js"
    with open(oldFileName, 'w') as oldFile:
        oldFile.write(oldFileContent)
    newFileName = fileName + ".ts"
    with open(newFileName, 'w') as newFile:
        newFile.write(newFileContent)

for url in tqdm(urls):
    for commit in Repository(url, num_workers = 1000).traverse_commits(): 
        newFiles = set()
        oldFiles = set()
        dirPath = r'./files/' + commit.project_name + "/"
        for modifiedFile in commit.modified_files:
            oldPath = modifiedFile.old_path
            newPath = modifiedFile.new_path
            if (oldPath != None and newPath != None):
                oldExt = Path(oldPath).suffix
                newExt = Path(newPath).suffix
                if (oldExt == ".js" and newExt == ".ts" and modifiedFile.source_code_before != None):
                    addFiles(dirPath, os.path.splitext(modifiedFile.filename)[0], modifiedFile.source_code_before, modifiedFile.source_code)
            elif (modifiedFile.source_code_before == None and newPath != None and Path(newPath).suffix == ".ts"):
                newFiles.add(modifiedFile)
            elif (modifiedFile.source_code == None and oldPath != None and Path(oldPath).suffix == ".js"):
                oldFiles.add(modifiedFile)
                
        for newFile in newFiles:
            for oldFile in oldFiles:
                if (ratio(newFile.source_code, oldFile.source_code_before, score_cutoff = 0.9) == 0.0): 
                    addFiles(dirPath, os.path.splitext(modifiedFile.filename)[0], oldFile.source_code_before, newFile.source_code)
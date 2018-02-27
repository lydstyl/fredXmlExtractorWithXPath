
/* 
  utilisation :  node xmlExtractor.js source.xml filtre_chemins.pathList > sortie.csv
  node xmlExtractor.js 20180227StagingAEContentAE.xml lydAsset.pathList > 20180227StagingAEContentAE.csv

  node xmlExtractor.js ./data/xml/my.xml ./pathLists/xxx/my.pathList > ./data/csv/my.csv
  exemple
  node xmlExtractor.js ./data/xml/20180227StagingAEContentAE.xml ./pathLists/content/lydFolder.pathList > ./data/csv/20180227StagingAEContentAE.csv
*/
/**
*  Classe de recherche
*/
function XMLValueQuery(node, filters) {
  this.node = node;
  this.filters = filters;
}

/**
* retourne une copie du tableau de chaines sans les elements vides
  retourn null si il n'y a plus d'éléemnts
*/
function cleanArray(array) {

  if (array == undefined || array == null || array.length < 1) {
      return null;
  } 

  let result = [];
  for (var i=0; i<array.length; i++) {
    let str = array[i].trim();
    if (str.length>0) {
      result.push(array[i]);
    }    
  }

  if (result.length==0) {
    return null;
  }

  return result;
}

/**
* retourne une copie du tableau sans le premier element
  retourn null si il n'y a plus d'éléemnts
*/
function popArray(array) {

  if (array == undefined || array == null || array.length < 2) {
      return null;
  }

  let result = [];
  for (var i=1; i<array.length; i++) {
    result.push(array[i]);
  }

  return result;
}

/**
*  Retourne la liste des filtres pour l'extraction (path = [],  liste des filtre = [][] )
*/
function getFilterPathList(pathFilterFileName) {

  let paths = require('fs').readFileSync(pathFilterFileName, 'utf8').split('\n');
  let pathList = [];
  for (var i=0; i<paths.length; i++) {
     let path = cleanArray(paths[i].split('/'));
     if (path != null) {
        pathList.push(path);
     }
  }

  return pathList;
}

/**
* vérifie si le ou les attributs d'un éléments correspondent à l'expression demandée.
* retourne la chaine de caractère correspondant à la valeurs des attributs du noeud.
* retourne null si l'élement ne correspond pas.
*/
function attributeMatch(searchAttributes,xmlNode) {

	let attrMatch=true;
        let nodeAttributes = xmlNode.attributes;
        let attributeNameRegExp = '^\\[attribute::([^=]*)=\\"([^\\]]*)\\"\\](.*)';
        let regExp = new RegExp(attributeNameRegExp);

        let attrStr = '';
			
	while (attrMatch && searchAttributes != null && searchAttributes.trim().length>0) {
                if (regExp.exec(searchAttributes)) {
			let filterAttributeName = RegExp.$1.trim();
			let filterAttributeValue = RegExp.$2.trim();
			
			if (nodeAttributes[filterAttributeName] != undefined) {
				nodeAttributeValue = nodeAttributes[filterAttributeName];
				if (filterAttributeValue=='*' || filterAttributeValue==nodeAttributeValue) {
                                        attrStr += '[attribute::'+ filterAttributeName + '="' + nodeAttributeValue +'"]';
                                        searchAttributes = RegExp.$3.trim();							
				} else {
                                    attrMatch = false;    
                                }   
			}
		} else {
                   attrMatch = false;
                }
        }

        if (attrMatch) {
             return attrStr;
        } else {
             return null;
        }

}

/**
*  Vérifie si l'element fait parti des éléments recherchés
*  Met à jour la liste des chemins de recherche
*/
function validatePath(pathList, pathFilter, xmlNode, currentPath) {
	let nextpath = popArray(pathFilter);
	if (nextpath == null) {
                if (xmlNode.children[0] != undefined && xmlNode.children[0] != null && xmlNode.children[0].text != undefined && xmlNode.children[0].text != null) {
                    console.log('"'+currentPath + '";"' + htmlEncoder.decode(xmlNode.children[0].text) +'"');
                }
	} else {
		pathList.push(nextpath);
	}
}

/**
* adapte la liste des filtres au noeud en cours
* complete le chemin de l'élément parcouru
*/
function findValue(searchedValue, elementPath) {

	let subPaths = [];
	let elementName = searchedValue.node.name;

        currentElementStr = '/';

	if (elementName == undefined) {
		// noeud root : les chemins filtres ne changent pas.
		subPaths = searchedValue.filters;

	} else {
                
		// parcours des chemins filtres pour tester si le noeud est eligible.
		for (var i=0; i<searchedValue.filters.length; i++) {

			let currentFilterPath = searchedValue.filters[i];
			let searchedElementName = currentFilterPath[0];
			if (searchedElementName == elementName) {
				// l'élément est présent dans le chemin
                                if (currentElementStr.indexOf(elementName)<0) {
                                      currentElementStr += elementName;
                                }
				validatePath(subPaths, currentFilterPath, searchedValue.node, elementPath + currentElementStr);

			} else if (searchedElementName.startsWith(elementName)) {
				// l'élément est présent dans le chemin mais il faut vérifier la valeur du ou des l'attributs.
                                if (currentElementStr.indexOf(elementName)<0) {
                                      currentElementStr += elementName;
                                }
				let searchAttributes = searchedElementName.substring(elementName.length);                      
				let attrStr = attributeMatch(searchAttributes,searchedValue.node);
			        if (attrStr != null) {
                                        if (currentElementStr.indexOf(attrStr)<0) {
                                      		currentElementStr += attrStr;
                                	}
					validatePath(subPaths, currentFilterPath, searchedValue.node, elementPath + currentElementStr);
			        }
			}
		}
	}

        // parcours des sous-noeuds
        let currentNodePath = elementPath + currentElementStr;
	if (subPaths.length>0) {
		let subElements = searchedValue.node.children;
		if (subElements != undefined && subElements!=null && subElements.length != 0) {
			for (var i=0; i<subElements.length; i++) {
                                let subValueQuery = new XMLValueQuery(subElements[i], subPaths);
				findValue(subValueQuery, currentNodePath);
			}
		}
	}

}

if (process.argv.length >= 4) {

        console.log('"xPath";"texte"');

	let xml = require('fs').readFileSync(process.argv[2], 'utf8');
	let pathList = getFilterPathList(process.argv[3]);

        var htmlEncoder = require('he');

	const parseXml = require('@rgrove/parse-xml');
	let xmlObject=parseXml(xml);
	findValue(new XMLValueQuery(xmlObject, pathList),'');


} else {

   console.log("usage : node xmlExtractor.js fichier.xml fichierChemins > sortie.csv");

   console.log("nécessite : ");
   console.log("npm install he");
   console.log("npm install @rgrove/parse-xml");

}



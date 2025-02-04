import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const TEMPLATES_PATH = path.join(process.cwd(), 'src/templates');

export default class CodeGenerator {
  constructor() {
    this.templates = {
      account: this.loadTemplate('account.hbs'),
      token: this.loadTemplate('token.hbs'),
      nft: this.loadTemplate('nft.hbs'),
      dao: this.loadTemplate('dao.hbs'),
      mint: this.loadTemplate('mint.hbs')
    };
  }

  loadTemplate(name) {
    return Handlebars.compile(
      fs.readFileSync(path.join(TEMPLATES_PATH, name), 'utf8')
    );
  }

  generate(nodes) {
    const codeParts = nodes.map(node => {
      const template = this.templates[node.type];
      if (!template) throw new Error(`No template for node type: ${node.type}`);
      
      return template({
        ...node.data,
        id: node.id,
        connections: node.connections
      });
    });

    return {
      rust: codeParts.join('\n\n'),
      typescript: this.generateClientCode(nodes)
    };
  }

  generateClientCode(nodes) {
    // Generate frontend interaction code
    return nodes.map(node => 
      `// Client code for ${node.type} node\n` +
      `export const ${node.id} = ${JSON.stringify(node.data)};`
    ).join('\n');
  }
}

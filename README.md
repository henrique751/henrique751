import tkinter as tk
from tkinter import messagebox
from tkinter.filedialog import asksaveasfilename

class CadastroAssociado:
    def __init__(self, root):
        self.root = root
        self.root.title("Cadastro de Associado")
        
        self.frame1 = tk.LabelFrame(root, text="Cadastro de associado")
        self.frame1.pack(padx=10, pady=10)
        
        # Campos de informações pessoais
        self.label_nome = tk.Label(self.frame1, text="Nome Completo:")
        self.label_nome.grid(row=0, column=0, sticky=tk.W)
        self.entry_nome = tk.Entry(self.frame1)
        self.entry_nome.grid(row=0, column=1)
        
        self.label_apelido = tk.Label(self.frame1, text="Apelido:")
        self.label_apelido.grid(row=1, column=0, sticky=tk.W)
        self.entry_apelido = tk.Entry(self.frame1)
        self.entry_apelido.grid(row=1, column=1)
        
        self.label_data_nascimento = tk.Label(self.frame1, text="Data de Nascimento (dd/mm/yyyy):")
        self.label_data_nascimento.grid(row=2, column=0, sticky=tk.W)
        self.entry_data_nascimento = tk.Entry(self.frame1)
        self.entry_data_nascimento.grid(row=2, column=1)
        
        self.label_nacionalidade = tk.Label(self.frame1, text="Nacionalidade:")
        self.label_nacionalidade.grid(row=3, column=0, sticky=tk.W)
        self.entry_nacionalidade = tk.Entry(self.frame1)
        self.entry_nacionalidade.grid(row=3, column=1)
        
        self.label_naturalidade = tk.Label(self.frame1, text="Naturalidade:")
        self.label_naturalidade.grid(row=4, column=0, sticky=tk.W)
        self.entry_naturalidade = tk.Entry(self.frame1)
        self.entry_naturalidade.grid(row=4, column=1)
        
        self.label_rg = tk.Label(self.frame1, text="RG:")
        self.label_rg.grid(row=5, column=0, sticky=tk.W)
        self.entry_rg = tk.Entry(self.frame1)
        self.entry_rg.grid(row=5, column=1)
        
        self.label_cpf = tk.Label(self.frame1, text="CPF:")
        self.label_cpf.grid(row=6, column=0, sticky=tk.W)
        self.entry_cpf = tk.Entry(self.frame1)
        self.entry_cpf.grid(row=6, column=1)
        
        self.label_pai = tk.Label(self.frame1, text="Pai:")
        self.label_pai.grid(row=7, column=0, sticky=tk.W)
        self.entry_pai = tk.Entry(self.frame1)
        self.entry_pai.grid(row=7, column=1)
        
        self.label_mae = tk.Label(self.frame1, text="Mãe:")
        self.label_mae.grid(row=8, column=0, sticky=tk.W)
        self.entry_mae = tk.Entry(self.frame1)
       ```python
        self.entry_mae.grid(row=8, column=1)
        
        self.frame2 = tk.LabelFrame(root, text="Endereço de associado")
        self.frame2.pack(padx=10, pady=10)
        
        # Campos de endereço
        self.label_sitio = tk.Label(self.frame2, text="Sítio:")
        self.label_sitio.grid(row=0, column=0, sticky=tk.W)
        self.entry_sitio = tk.Entry(self.frame2)
        self.entry_sitio.grid(row=0, column=1)
        
        self.label_rua = tk.Label(self.frame2, text="Rua:")
        self.label_rua.grid(row=1, column=0, sticky=tk.W)
        self.entry_rua = tk.Entry(self.frame2)
        self.entry_rua.grid(row=1, column=1)
        
        self.label_lote = tk.Label(self.frame2, text="Lote:")
        self.label_lote.grid(row=2, column=0, sticky=tk.W)
        self.entry_lote = tk.Entry(self.frame2)
        self.entry_lote.grid(row=2, column=1)
        
        self.label_modulo = tk.Label(self.frame2, text="Módulo:")
        self.label_modulo.grid(row=3, column=0, sticky=tk.W)
        self.entry_modulo = tk.Entry(self.frame2)
        self.entry_modulo.grid(row=3, column=1)
        
        self.label_dap = tk.Label(self.frame2, text="DAP:")
        self.label_dap.grid(row=4, column=0, sticky=tk.W)
        self.entry_dap = tk.Entry(self.frame2)
        self.entry_dap.grid(row=4, column=1)
        
        self.frame3 = tk.LabelFrame(root, text="Outros documentos")
        self.frame3.pack(padx=10, pady=10)
        
        # Campos de outros documentos
        self.label_titulo_eleitoral = tk.Label(self.frame3, text="Título Eleitoral:")
        self.label_titulo_eleitoral.grid(row=0, column=0, sticky=tk.W)
        self.entry_titulo_eleitoral = tk.Entry(self.frame3)
        self.entry_titulo_eleitoral.grid(row=0, column=1)
        
        self.label_zona = tk.Label(self.frame3, text="Zona:")
        self.label_zona.grid(row=1, column=0, sticky=tk.W)
        self.entry_zona = tk.Entry(self.frame3)
        self.entry_zona.grid(row=1, column=1)
        
        self.label_secao = tk.Label(self.frame3, text="Seção:")
        self.label_secao.grid(row=2, column=0, sticky=tk.W)
        self.entry_secao = tk.Entry(self.frame3)
        self.entry_secao.grid(row=2, column=1)
        
        self.label_carteira_trabalho = tk.Label(self.frame3, text="Carteira de Trabalho:")
        self.label_carteira_trabalho.grid(row=3, column=0, sticky=tk.W)
        self.entry_carteira_trabalho = tk.Entry(self.frame3)
        self.entry_carteira_trabalho.grid(row=3, column=1)
        
        self.label_serie = tk.Label(self.frame3, text="Série:")
        self.label_serie.grid(row=4, column=0, sticky=tk.W)
        self.entry_serie = tk.Entry(self.frame3)
        self.entry_serie.grid(row=4, column=1)
        
        self.label_numero_nis = tk.Label(self.frame```python
3, text="Número do NIS:")
        self.label_numero_nis.grid(row=5, column=0, sticky=tk.W)
        self.entry_numero_nis = tk.Entry(self.frame3)
        self.entry_numero_nis.grid(row=5, column=1)
        
        self.label_numero_sus = tk.Label(self.frame3, text="Número do SUS:")
        self.label_numero_sus.grid(row=6, column=0, sticky=tk.W)
        self.entry_numero_sus = tk.Entry(self.frame3)
        self.entry_numero_sus.grid(row=6, column=1)
        
        self.frame4 = tk.Frame(root)
        self.frame4.pack(pady=10)
        
        # Botão Salvar Cadastro
        self.button_salvar = tk.Button(self.frame4, text="Salvar Cadastro", command=self.salvar_cadastro)
        self.button_salvar.pack(side=tk.LEFT, padx=10)
        
        # Botão Relatório de Cadastros
        self.button_relatorio = tk.Button(self.frame4, text="Relatório de Cadastros", command=self.gerar_relatorio)
        self.button_relatorio.pack(side=tk.LEFT, padx=10)
        
        # Botão de Impressão
        self.button_imprimir = tk.Button(self.frame4, text="Imprimir", command=self.imprimir_cadastro)
        self.button_imprimir.pack(side=tk.LEFT, padx=10)
    
    def salvar_cadastro(self):
        cadastro_info = f"Titulo: Cadastro de Associados\n{self.entry_nome.get()}, mais conhecido(a) por {self.entry_apelido.get()}, {self.entry_nacionalidade.get()}, maior, solteiro(a), agricultora, natural de {self.entry_naturalidade.get()}, nascida em {self.entry_data_nascimento.get()}, RG nº. {self.entry_rg.get()}, SSP/BA, CPF nº. {self.entry_cpf.get()}, filha de {self.entry_pai.get()} e {self.entry_mae.get()}.\n\n"
        
        endereco_info = f"Titulo: Endereço de Associado\n{self.entry_sitio.get()}, localizado na rua {self.entry_rua.get()}, lote {self.entry_lote.get()}, modulo {self.entry_modulo.get()}, DAP {self.entry_dap.get()}, Associação 3 de julho, Zona Rural, município de Eunápolis-BA.\n\n"
        
        outros_documentos_info = f"Titulo: Outros Documentos\nTitulo Eleitoral nº. {self.entry_titulo_eleitoral.get()}\tZona: {self.entry_zona.get()}\tSeção: {self.entry_secao.get()}\nCarteira de Trabalho: {self.entry_carteira_trabalho.get()}\tSerie: {self.entry_serie.get()}\nNumero do NIS: {self.entry_numero_nis.get()}\tNumero do SUS: {self.entry_numero_sus.get()}"
        
        cadastro_completo = cadastro_info + endereco_info + outros_documentos_info
        
        save_path = asksaveasfilename(defaultextension=".txt")
        if save_path:
            with open(save_path, "w") as file:
                file.write(cadastro_completo)
            messagebox.showinfo("Cadastro Salvo", "O cadastro foi salvo com sucesso.")
    
    def gerar_relatorio(self):
        # Implemente a lógica para gerar o relatório de cadastros
        pass
    
    def imprimir_cadastro(self):
        # Implemente a lógica para imprimir o cadastro
        pass

# Continuação do código

```python
# Código principal
root = tk.Tk()
app = CadastroAssociado(root)
root.mainloop()

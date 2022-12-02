import streamlit as st
import fractions
import numpy as np
import pandas as pd
np.set_printoptions(formatter={'all':lambda x: str(fractions.Fraction(x).limit_denominator())})

# SIMPLEX POR QUADROS
def select_incoming_variable(M):
    minimum = M[0][0]  
    index   = 0
    for i in range(len(M[0])):
        if M[0][i] < minimum:
            minimum = M[0][i]
            index   = i
    return  index, minimum
        
def select_outgoing_variable(M,s):
    r       = -1
    minimum = 9999999
    for i in range(len(M) - 1):
        if M[i + 1][s] > 0:
            frac = M[i + 1][len(M[0]) - 1]/M[i + 1][s]
            #print( M[i + 1][len(M) - 1],M[i + 1][s],frac)
            print( i + 1,len(M[0]) - 1,i + 1,s,frac)
            if frac < minimum:
                minimum = frac
                r = i + 1
    return r

def pivot(M,r,s):
    M[r] = M[r]/(M[r][s])
    for i in range(len(M)):
        if i != r:
            M[i] = M[i] - M[i][s]*M[r]
    return M
    
    
def simplex(M, print_iter = True):   
    end    = False
    status = "OPT"
    l_iter = []
    l_iter.append(M.copy())
    
    while end == False:
        s, value = select_incoming_variable(M) 
        print("Entra na base :",s)
        if value >= 0:
            end = True
            status = "OPT"
        else:
            r = select_outgoing_variable(M, s)
            if r != -1:
                M = pivot(M,r,s)
                l_iter.append(M.copy())
            else:
                status = "UNB"
                end = True
    return M, status, l_iter


st.write("# Simplex por quadros")

uploaded_file = st.file_uploader("Adicione o modelo (.csv)")
#model = pd.read_csv(r"G:\Meu Drive\Arquivos\UFPR\Disciplinas\modelo.csv", sep = ";", header = None)


if st.button('Adiciona número') == True:
    l_iter = []
    model = pd.read_csv(uploaded_file, sep = ";", header = None)
    M = np.array(model, dtype = float)
    M_final, status, l_iter = simplex(M)
    for e in l_iter:
        e
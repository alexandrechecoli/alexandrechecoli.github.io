import streamlit as st
import fractions
import numpy as np
import pandas as pd
from fractions import Fraction
np.set_printoptions(formatter={'all':lambda x: str(fractions.Fraction(x).limit_denominator())})

# SIMPLEX POR QUADROS
def select_incoming_variable(M):
    minimum = M[0][0]  
    index   = 0
    for i in range(len(M[0]) - 1): #-1 PARA NÃO SELECIONAR O rhs
        if M[0][i] < minimum:
            print("eo ",M[0][i])
            minimum = M[0][i]
            index   = i
    return  index, minimum
        
def select_outgoing_variable(M,s):
    r       = -1
    minimum = 9999999
    for i in range(len(M) - 1):
        if M[i + 1][s] > 0:
            frac = M[i + 1][len(M[0]) - 1]/M[i + 1][s]
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

    if print_iter: print(M, "\n")
        
    
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
                if print_iter:
                    print("Pivot : ({},{})".format(r,s))
                    print(M, "\n")
            else:
                status = "UNB"
                end = True
    return M, status

def select_outgoing_variable_dual(M):
    r       = -1
    minimum = 9999999
    for i in range(len(M) - 1):
        if M[i + 1][len(M[0]) - 1] < minimum:
            minimum = M[i + 1][len(M[0]) - 1]
            r = i + 1
    if minimum > 0: r = -1
    return r

def select_incoming_variable_dual(M, r):
    max_frac = -9999999
    c = -1
    for j in range(len(M[0]) - 1):
        if M[r][j]< 0:
            frac = M[0][j]/M[r][j]
            if frac > max_frac:
                max_frac = frac
                c = j
    return c
            

def dual_simplex(M, print_iter = True):   
    end    = False
    status = "OPT"

    if print_iter: print(M, "\n")
        
    
    while end == False:
        r = select_outgoing_variable_dual(M)
        if r < 0:
            end = True
            status = "OPT"
        else:
            c = select_incoming_variable_dual(M,r)
            if c < 0:
                end = True
                status = "INF"
            else:
                print("PIVOT",r,c)
                M = pivot(M,r,c)
                print(M)
    return M, status


def convert_fraction(df):
    M = []
    for i in range(df.shape[0]):
        l = []
        for c in df.columns:
            s = str(df[c].iloc[i])
            l.append(float(sum(Fraction(s) for s in s.split())))
        M.append(l)
    M = np.array(M)
    return M

frac = str(Fraction(0.25))
frac

def convert_array_to_str_frac(M):
    M_str = []
    for i in range(len(M)):
        str_row = []
        for j in range(len(M[0])):
            str_row.append(str(Fraction(M[i][j])))
        M_str.append(str_row)
    return M_str


st.write("# Simplex por quadros")

uploaded_file = st.file_uploader("Adicione o modelo (.csv)")
#model = pd.read_csv(r"G:\Meu Drive\Arquivos\UFPR\Disciplinas\modelo.csv", sep = ";", header = None)


if st.button('Adiciona número') == True:
    l_iter = []
    model = pd.read_csv(uploaded_file, sep = ";", header = None)
    M = convert_fraction(model)
    M = np.array(model, dtype = float)
    M_final, status = simplex(M)
    st.write(M)
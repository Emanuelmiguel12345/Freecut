-- ESP SYSTEM WITH HIGHLIGHT AND TEXTLABEL
-- Autor: Sistema ESP Avançado v1.0
-- Compatível com qualquer executor

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local LocalPlayer = Players.LocalPlayer
local Camera = workspace.CurrentCamera

-- CONFIGURAÇÕES
local CONFIG = {
    MaxDistance = 5000,
    TextSize = 16,
    HighlightThickness = 2,
    
    Categories = {
        Animatronics = {
            Path = "workspace.Game.Animatronics.Animatronics",
            Color = Color3.fromRGB(255, 0, 0), -- Vermelho
            Name = "ANIMATRONIC"
        },
        Toys = {
            Path = "workspace.Game.Animatronics.Toys",
            Color = Color3.fromRGB(255, 255, 0), -- Amarelo
            Name = "TOY"
        },
        Fuse = {
            Path = "workspace.Fuse",
            Color = Color3.fromRGB(0, 255, 0), -- Verde
            Name = "FUSE"
        }
    }
}

-- ARMAZENAMENTO DE ESPs
local ActiveESPs = {}

-- FUNÇÃO: Criar Highlight
local function CreateHighlight(object, color)
    local highlight = Instance.new("Highlight")
    highlight.Name = "ESP_Highlight"
    highlight.Adornee = object
    highlight.FillColor = color
    highlight.OutlineColor = color
    highlight.FillTransparency = 0.5
    highlight.OutlineTransparency = 0
    highlight.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    highlight.Parent = object
    return highlight
end

-- FUNÇÃO: Criar BillboardGui com TextLabel
local function CreateBillboard(object, displayName, color)
    local billboard = Instance.new("BillboardGui")
    billboard.Name = "ESP_Billboard"
    billboard.Adornee = object
    billboard.Size = UDim2.new(0, 200, 0, 50)
    billboard.StudsOffset = Vector3.new(0, 3, 0)
    billboard.AlwaysOnTop = true
    billboard.MaxDistance = CONFIG.MaxDistance
    
    local textLabel = Instance.new("TextLabel")
    textLabel.Name = "ESP_Text"
    textLabel.Size = UDim2.new(1, 0, 1, 0)
    textLabel.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
    textLabel.BackgroundTransparency = 0.3
    textLabel.BorderSizePixel = 0
    textLabel.Text = displayName
    textLabel.TextColor3 = color
    textLabel.TextSize = CONFIG.TextSize
    textLabel.TextStrokeTransparency = 0.5
    textLabel.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
    textLabel.Font = Enum.Font.GothamBold
    textLabel.TextScaled = false
    textLabel.Parent = billboard
    
    -- Adicionar UICorner para aparência moderna
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 8)
    corner.Parent = textLabel
    
    billboard.Parent = game:GetService("CoreGui")
    return billboard
end

-- FUNÇÃO: Calcular distância do jogador
local function GetDistance(object)
    if not LocalPlayer.Character or not LocalPlayer.Character:FindFirstChild("HumanoidRootPart") then
        return math.huge
    end
    
    local playerPos = LocalPlayer.Character.HumanoidRootPart.Position
    local objectPos = object:IsA("Model") and object:GetPivot().Position or object.Position
    return (playerPos - objectPos).Magnitude
end

-- FUNÇÃO: Adicionar ESP a um objeto
local function AddESP(object, category)
    if not object or ActiveESPs[object] then return end
    
    local config = CONFIG.Categories[category]
    if not config then return end
    
    -- Criar componentes ESP
    local highlight = CreateHighlight(object, config.Color)
    local displayName = string.format("[%s] %s", config.Name, object.Name)
    local billboard = CreateBillboard(object, displayName, config.Color)
    
    -- Armazenar referências
    ActiveESPs[object] = {
        Highlight = highlight,
        Billboard = billboard,
        Category = category,
        Object = object
    }
    
    print(string.format("✓ ESP adicionado: %s [%s]", object.Name, category))
end

-- FUNÇÃO: Remover ESP de um objeto
local function RemoveESP(object)
    local espData = ActiveESPs[object]
    if not espData then return end
    
    if espData.Highlight then
        espData.Highlight:Destroy()
    end
    if espData.Billboard then
        espData.Billboard:Destroy()
    end
    
    ActiveESPs[object] = nil
    print(string.format("✗ ESP removido: %s", object.Name))
end

-- FUNÇÃO: Atualizar ESPs (distância e visibilidade)
local function UpdateESPs()
    for object, espData in pairs(ActiveESPs) do
        if not object or not object.Parent then
            RemoveESP(object)
            continue
        end
        
        local distance = GetDistance(object)
        
        -- Atualizar texto com distância
        if espData.Billboard and espData.Billboard:FindFirstChild("ESP_Text") then
            local config = CONFIG.Categories[espData.Category]
            local displayName = string.format("[%s] %s\n%.1fm", 
                config.Name, 
                object.Name, 
                distance
            )
            espData.Billboard.ESP_Text.Text = displayName
        end
    end
end

-- FUNÇÃO: Processar pasta (Animatronics ou Toys)
local function ProcessFolder(folder, category)
    if not folder then 
        warn(string.format("⚠ Pasta não encontrada: %s", CONFIG.Categories[category].Path))
        return 
    end
    
    print(string.format("📁 Processando pasta: %s", folder:GetFullName()))
    
    -- Adicionar ESPs aos objetos existentes
    for _, child in ipairs(folder:GetChildren()) do
        AddESP(child, category)
    end
    
    -- Monitorar novos objetos
    folder.ChildAdded:Connect(function(child)
        task.wait(0.1)
        AddESP(child, category)
    end)
    
    -- Remover ESPs quando objetos são deletados
    folder.ChildRemoved:Connect(function(child)
        RemoveESP(child)
    end)
end

-- FUNÇÃO: Processar objeto único (Fuse)
local function ProcessSingleObject(object, category)
    if object then
        print(string.format("🎯 Objeto encontrado: %s", object:GetFullName()))
        AddESP(object, category)
    else
        warn(string.format("⚠ Objeto não encontrado: %s", CONFIG.Categories[category].Path))
        
        -- Monitorar caso o objeto apareça depois
        local parent = workspace
        parent.ChildAdded:Connect(function(child)
            if child.Name == "Fuse" then
                task.wait(0.1)
                print("🎯 Fuse detectado!")
                AddESP(child, category)
            end
        end)
    end
end

-- FUNÇÃO: Inicializar sistema ESP
local function InitializeESP()
    print("═══════════════════════════════════")
    print("🔍 SISTEMA ESP INICIADO")
    print("═══════════════════════════════════")
    
    -- Processar Animatronics
    local animatronicsFolder = workspace:FindFirstChild("Game") 
        and workspace.Game:FindFirstChild("Animatronics") 
        and workspace.Game.Animatronics:FindFirstChild("Animatronics")
    ProcessFolder(animatronicsFolder, "Animatronics")
    
    -- Processar Toys
    local toysFolder = workspace:FindFirstChild("Game") 
        and workspace.Game:FindFirstChild("Animatronics") 
        and workspace.Game.Animatronics:FindFirstChild("Toys")
    ProcessFolder(toysFolder, "Toys")
    
    -- Processar Fuse
    local fuse = workspace:FindFirstChild("Fuse")
    ProcessSingleObject(fuse, "Fuse")
    
    print("═══════════════════════════════════")
    print(string.format("✓ Total de ESPs ativos: %d", #ActiveESPs))
    print("═══════════════════════════════════")
end

-- FUNÇÃO: Limpar todos os ESPs
local function CleanupESP()
    print("🧹 Limpando todos os ESPs...")
    
    for object, _ in pairs(ActiveESPs) do
        RemoveESP(object)
    end
    
    print("✓ Todos os ESPs foram removidos")
end

-- INICIALIZAÇÃO
InitializeESP()

-- ATUALIZAÇÃO CONTÍNUA (60 FPS)
RunService.RenderStepped:Connect(UpdateESPs)

-- COMANDO PARA DESATIVAR (opcional)
-- Para desativar, execute: CleanupESP()

print("💡 Para desativar o ESP, execute: CleanupESP()")
print("Sistema ESP pronto e operacional!")

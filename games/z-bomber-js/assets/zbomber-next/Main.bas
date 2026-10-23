' Z-BOMBER - space strategy for the ZX Spectrum Next, in NTC BASIC: capture the flag across five
' sectors of the solar system, seen as an isometric board of 8 x 8 sectors floating in space.
' (c) 2026 Cyborg Unicorn Pty Ltd
'
' The IRON SWARM is coming in from beyond Neptune, sector by sector. In each sector both sides
' keep a STAR KEY in their home base: take theirs home while you keep yours, and the sector's jump
' gate is yours. Your fleets are frigates and the Z-BOMBER (three craft that combine into one);
' theirs are drones. Fleets move a sector at a time; where fleets of both sides meet, they fight.
' Planets you hold build ships at your base. Between the battles the crew talk (the faces of
' KPOP GROUP MANAGER's people, put together from sprite parts: Face.cls), from the story in the
' Next's other RAM (Data.cls, made by tools/storyc.py from scripts/STORY.txt).
'
' Keys: Q A O P (or the joystick) move the cursor a sector. Space on one of your fleets picks it
'       (the clock stops while you give the order); move to where it should go and Space again.
'       M while a fleet is picked: send all of it, or half. In a talk: Space goes on, Q A pick.
'
' The board is Layer 2 (Iso.cls: the sector pictures from tools/isoart.py), the fleets, keys and
' flags are sprites, the panel and the text are the tilemap (on top).
Option Explicit
Option Turbo

Const NF = 16, MAXS = 99
' sprite slots: the cursor (2), the picked ring (2), the target, the keys (2), planets' flags (16),
' the fleets (4 each: the ship (2: the Z-BOMBER is 32 wide), tens, units), the battle (8)
Const SP_CUR = 0, SP_PICK = 2, SP_TGT = 4, SP_KEY = 5, SP_FLAG = 8, SP_FL = 24, SP_FX = 88
' the sectors
Const T_SPACE = 0, T_NEB = 1, T_ROCK = 2, T_RIFT = 3, T_PLANET = 4, T_BLUE = 7, T_RED = 8
' the cast (their records in people.bin: tools/cast.py)
Const K_YOU = 0, K_JIN = 1, K_MAYA = 2, K_YOON = 3, K_ARI = 4, K_VELK = 5, K_SERA = 6, K_ODO = 7
Const BLUE = 1, RED = 2

Dim longText As String Max 120, pName As String Max 8, lab0 As String Max 40, lab1 As String Max 40, txt As String Max 80
Dim mapName As String Max 20, info As String Max 40
Dim cLook(71) As Byte, rec(31) As Byte, recOf As Integer
' a talk: the scene, a line of it, a directory entry
Dim sb(767) As Byte, lb(159) As Byte, de8(7) As Byte
Dim talking As Integer, spk As Integer, picked As Integer, faceOn As Integer, fast As Integer, keyT As Integer, firWas As Integer
' the board: each sector's kind (T_...), who holds it (planets: 0 nobody, BLUE, RED), a distance
Dim mt(63) As Byte, own(63) As Byte, dist(63) As Byte, que(63) As Byte, fl8(15) As Integer
' fleets: side (0 none), sector, ships, target (-1 none), the next sector, frames to it, the step's
' length, carrying a key (0, or the side whose key)
Dim fo(15) As Integer, fs(15) As Integer, fn(15) As Integer, ft(15) As Integer, fx(15) As Integer
Dim fw(15) As Integer, fd(15) As Integer, fk(15) As Integer
' the keys (1 yours, 2 theirs): 0 at home, 1 carried (by fleet kf), 2 dropped (in sector kd)
Dim ks(2) As Integer, kf(2) As Integer, kd(2) As Integer, baseS(2) As Integer, prodT(2) As Integer, prodN(2) As Integer
' the Z-BOMBER: its fleet (-1: back at base being mended), its hull, how strong
Dim zf As Integer, zhp As Integer, zmax As Integer, zpow As Integer, zDown As Integer, refit As Integer, extra As Integer
Dim sector As Integer, tries As Integer, result As Integer, combined As Integer, battles As Integer, won As Integer, lost As Integer
Dim cur As Integer, sel As Integer, half As Integer, frames As Integer, aiN As Integer, msgT As Integer, hudT As Integer
Dim garMin As Integer, raid As Integer
Dim i As Integer, k As Integer, t As Integer
' tables built once by Tables (the hot loops read these instead of working it out every frame):
' a sector's x, y on the screen, its row, its four neighbours (255: off the board; the order is
' Nb's), the two digit sprite patterns of a ship count 0-99, the star colours of the sky
Dim sxT(63) As Byte, syT(63) As Byte, rwT(63) As Byte
Dim nbE(63) As Byte, nbW(63) As Byte, nbS(63) As Byte, nbN(63) As Byte
Dim dgT(99) As Byte, dgU(99) As Byte, starC(5) As Byte, n64(99) As Integer
' the routes: Field's answer for every target sector is kept (fcache: 64 bytes a target, fcOK: have
' it), fbase = where the last asked one starts. They only change when the map does.
Dim fcache(4095) As Byte, fcOK(63) As Byte, fbase As Integer
' drawing: a fleet's place on the screen (the key it carries follows it), which fleet slots have
' sprites showing, the planets' flags need drawing again; fstamp = what a standing fleet's sprites were drawn for (it
' is only drawn again when that changes), fmax = the fleet slots in use (the highest one + 1)
Dim fix(15) As Integer, fiy(15) As Integer, fShown(15) As Byte, fstamp(15) As Integer, fmax As Integer
Dim flagsDirty As Integer

Nx.Border 0
Tables
Tiles.Init
Spr.Init
GfxData.Load
Sfx.Init
Data.Init
Iso.Init
fmax = NF : recOf = -1
For k = 0 To 7
  LoadRec k
  For t = 0 To 8
    cLook(k * 9 + t) = rec(8 + t)
  Next
Next
Nx.Layers Nx.OrderUSL                   ' the tilemap on top (the panel, the text), sprites, Layer 2
Nx.Reg &H15, Nx.RegGet(&H15) Or &H20
pName = ""
Do
  Title
  Campaign
Loop

' ---------------------------------------------------------------- the sky and the board
Sub Sky()
  Dim j As Integer
  Iso.Fill 1
  j = 0
  For k = 0 To 140
    Iso.Plot Rnd(256), Rnd(192), starC(j)
    j = j + 1
    If j = 6 Then j = 0
  Next
End Sub

' Tables: the lookup tables (once, at the start)
Sub Tables()
  Dim s As Integer, v As Integer
  For s = 0 To 63
    sxT(s) = SX(s) : syT(s) = SY(s) : rwT(s) = s \ 8
    v = Nb(s, 0) : If v < 0 Then v = 255
    nbE(s) = v
    v = Nb(s, 1) : If v < 0 Then v = 255
    nbW(s) = v
    v = Nb(s, 2) : If v < 0 Then v = 255
    nbS(s) = v
    v = Nb(s, 3) : If v < 0 Then v = 255
    nbN(s) = v
    fcOK(s) = 0
  Next
  For s = 0 To 99
    dgT(s) = GfxData.S_DIGIT + s \ 10
    dgU(s) = GfxData.S_DIGIT + s Mod 10
    n64(s) = s * 64
  Next
  starC(0) = 255 : starC(1) = 182 : starC(2) = 109 : starC(3) = 146 : starC(4) = 73 : starC(5) = 255
End Sub

Function SX(ByVal s As Integer) As Integer
  SX = 128 + ((s And 7) - (s \ 8)) * 16
End Function

Function SY(ByVal s As Integer) As Integer
  SY = 46 + ((s And 7) + (s \ 8)) * 8
End Function

' the board's pictures, back to front
Sub DrawBoard()
  Dim d As Integer, c As Integer, r As Integer, s As Integer, p As Integer
  Sky
  For d = 0 To 14
    For c = 0 To 7
      r = d - c
      If r >= 0 And r <= 7 Then
        s = r * 8 + c
        p = mt(s)
        If p = T_PLANET Then p = 4 + (c * 3 + r) Mod 3
        If p < 6 Then Iso.Pic Data.BLOCKPAGE, p, sxT(s) - 16, syT(s) - 24 Else Iso.Pic Data.BLOCKPAGE + 1, p - 6, sxT(s) - 16, syT(s) - 24
      End If
    Next
  Next
End Sub

' the sector's map: 8 rows of 8 (. space, n nebula, a asteroids, x a rift, p a planet, B you, R them)
Sub LoadMap(ByVal m As Integer)
  Dim r As Integer, s As String, c As Integer, ch As String
  For r = 0 To 7
    s = MapRow(m, r)
    For c = 0 To 7
      ch = Mid$(s, c + 1, 1)
      k = r * 8 + c
      own(k) = 0 : fcOK(k) = 0           ' (the routes were for the last map)
      Select Case ch
        Case "n" : mt(k) = T_NEB
        Case "a" : mt(k) = T_ROCK
        Case "x" : mt(k) = T_RIFT
        Case "p" : mt(k) = T_PLANET
        Case "B" : mt(k) = T_BLUE : baseS(BLUE) = k
        Case "R" : mt(k) = T_RED : baseS(RED) = k
        Case Else : mt(k) = T_SPACE
      End Select
    Next
  Next
End Sub

Function MapRow(ByVal m As Integer, ByVal r As Integer) As String
  Dim s As String Max 64
  Select Case m
    Case 1 : s = "..p...aR.........n..p......a..p..p..a......p..n.........Ba...p.."
    Case 2 : s = ".aa.p.aRa..a...a.p.aa.p.a..p..a..a..p..a.p.aa.p.a...a..aBa.p.aa."
    Case 3 : s = "..n.p.nR.n..x..np..n..p..x.p.n....n.p.x..p..n..pn..x..n.Bn.p.n.."
    Case 4 : s = "..p..n.Rp...a.....ax.xa..a.p..x..x..p.a..ax.xa.....a...pBn..p..."
    Case Else : s = ".p.n.pxRp.a...x..n.x.p....p.n.a..a.n.p....p.x.n..x...a.pBx.p.n.."
  End Select
  MapRow = Mid$(s, r * 8 + 1, 8)
End Function

Function SectorName(ByVal m As Integer) As String
  Select Case m
    Case 1 : SectorName = "MARS GATE"
    Case 2 : SectorName = "THE BELT"
    Case 3 : SectorName = "GANYMEDE"
    Case 4 : SectorName = "THE RINGS"
    Case Else : SectorName = "THE HOLLOW THRONE"
  End Select
End Function

' Field s: the steps from sector s to every sector (255: can't get there), kept in fcache from
' fbase on. A breadth first search from s with the neighbours from the tables, done once for
' each target and kept until the map changes (dist and que are its working space).
Sub Field(ByVal s As Integer)
  Dim h As Integer, e As Integer, u As Integer, v As Integer, d As Integer
  fbase = s * 64
  If fcOK(s) Then Exit Sub
  For k = 0 To 63
    dist(k) = 255
  Next
  dist(s) = 0 : que(0) = s : h = 0 : e = 1
  Do While h < e
    u = que(h) : h = h + 1
    d = dist(u) + 1
    v = nbE(u)
    If v < 64 Then
      If dist(v) = 255 And mt(v) <> T_RIFT Then dist(v) = d : que(e) = v : e = e + 1
    End If
    v = nbW(u)
    If v < 64 Then
      If dist(v) = 255 And mt(v) <> T_RIFT Then dist(v) = d : que(e) = v : e = e + 1
    End If
    v = nbS(u)
    If v < 64 Then
      If dist(v) = 255 And mt(v) <> T_RIFT Then dist(v) = d : que(e) = v : e = e + 1
    End If
    v = nbN(u)
    If v < 64 Then
      If dist(v) = 255 And mt(v) <> T_RIFT Then dist(v) = d : que(e) = v : e = e + 1
    End If
  Loop
  For k = 0 To 63
    fcache(fbase + k) = dist(k)
  Next
  fcOK(s) = 1
End Sub

' the k-th neighbour (0-3) of sector s: -1 off the board
Function Nb(ByVal s As Integer, ByVal k As Integer) As Integer
  Dim c As Integer, r As Integer
  c = s And 7 : r = s \ 8
  Select Case k
    Case 0 : c = c + 1
    Case 1 : c = c - 1
    Case 2 : r = r + 1
    Case Else : r = r - 1
  End Select
  If c < 0 Or c > 7 Or r < 0 Or r > 7 Then Nb = -1 Else Nb = r * 8 + c
End Function

' steps between two sectors (as the crow flies)
Function Far(ByVal a As Integer, ByVal b As Integer) As Integer
  Far = Abs((a And 7) - (b And 7)) + Abs(rwT(a) - rwT(b))
End Function

' ---------------------------------------------------------------- the campaign
Sub Campaign()
  sector = 1 : tries = 3 : refit = 0 : extra = 0 : won = 0 : lost = 0
  Talk Data.S_PROLOGUE
  Do
    mapName = SectorName(sector)
    LoadMap sector
    DrawBoard
    Talk Data.S_M1IN + (sector - 1) * 4
    PlayMap
    If result = BLUE Then
      won = won + 1
      Talk Data.S_M1WIN + (sector - 1) * 4
      If sector < 5 Then
        If picked = 1 Then refit = refit + 1 Else extra = extra + 6
      End If
      If sector = 5 Then
        Talk Data.S_ENDING
        TheEnd
        Exit Sub
      End If
      sector = sector + 1
    Else
      lost = lost + 1
      Talk Data.S_M1LOSE + (sector - 1) * 4
      tries = tries - 1
      If tries < 0 Then
        Talk Data.S_GAMEOVER
        TheEnd
        Exit Sub
      End If
    End If
  Loop
End Sub

' StartMap: the fleets and the keys at the start of a sector
Sub StartMap()
  Dim f As Integer
  For f = 0 To NF - 1
    fo(f) = 0
  Next
  fmax = 0
  For k = 1 To 2
    ks(k) = 0 : kf(k) = -1 : kd(k) = -1 : prodN(k) = 0
  Next
  ' the Swarm holds the planets near its base, more of them further out
  For k = 0 To 63
    If mt(k) = T_PLANET And Far(k, baseS(RED)) <= sector + 1 Then own(k) = RED
  Next
  f = NewFleet(BLUE, baseS(BLUE), 6 + extra)
  zf = f : zmax = 10 + refit * 4 : zhp = zmax : zpow = 6 + refit * 3 : zDown = 0
  f = NewFleet(RED, baseS(RED), 10 + sector * 4)
  If sector >= 2 Then f = NewFleet(RED, Nb(baseS(RED), 2), 3 + sector)
  If sector >= 4 Then f = NewFleet(RED, Nb(baseS(RED), 1), 3 + sector)
  prodT(BLUE) = 250 : prodT(RED) = 280 - sector * 25
  garMin = 3 + sector : raid = 5 + sector * 2
  cur = baseS(BLUE) : sel = -1 : half = 0 : combined = 0 : result = 0
  flagsDirty = 1
End Sub

Function NewFleet(ByVal side As Integer, ByVal s As Integer, ByVal n As Integer) As Integer
  Dim f As Integer
  For f = 0 To NF - 1
    If fo(f) = 0 Then
      fo(f) = side : fs(f) = s : fn(f) = n : ft(f) = -1 : fx(f) = -1 : fw(f) = 0 : fd(f) = 1 : fk(f) = 0
      fstamp(f) = -1
      If f >= fmax Then fmax = f + 1
      NewFleet = f
      Exit Function
    End If
  Next
  NewFleet = -1
End Function

' ---------------------------------------------------------------- the play
Sub PlayMap()
  Dim v As Integer, f As Integer
  StartMap
  Panel
  Do
    Tick
    v = Key()
    If v >= 1 And v <= 4 Then MoveCursor v
    If v = 5 Then Pick
    If v = 6 And sel >= 0 Then
      half = 1 - half : Blip
      HudText
    End If
    If sel < 0 Then
      ' the clock runs only while no fleet is picked
      Clock
      If result Then Exit Do
    End If
    DrawAll
    If msgT > 0 Then
      msgT = msgT - 1
      If msgT = 0 Then CursorInfo
    End If
    hudT = hudT + 1
    If hudT >= 50 Then hudT = 0 : HudText
  Loop
  WaitF 40
  Spr.HideRange 0, 96
End Sub

Sub MoveCursor(ByVal v As Integer)
  Dim c As Integer, r As Integer
  c = cur And 7 : r = cur \ 8
  ' the board is turned: Q up-right, A down-left, O up-left, P down-right
  If v = 1 And r > 0 Then r = r - 1
  If v = 2 And r < 7 Then r = r + 1
  If v = 3 And c > 0 Then c = c - 1
  If v = 4 And c < 7 Then c = c + 1
  cur = r * 8 + c
  Sfx.Play 0, 200, 0, 8, 2, 0
  CursorInfo
End Sub

' Space: pick a fleet of yours here, or send the picked one here
Sub Pick()
  Dim f As Integer, best As Integer, g As Integer
  If sel < 0 Then
    best = -1
    For f = 0 To NF - 1
      If fo(f) = BLUE And fs(f) = cur Then
        If best < 0 Then
          best = f
        ElseIf Power(f) > Power(best) Then
          best = f
        End If
      End If
    Next
    If best >= 0 Then
      sel = best : half = 0 : Blip
      Msg "WHERE TO? SPACE: SEND  M: ALL / HALF", 0
      HudText
    Else
      Sfx.Play 0, 400, 0, 10, 4, 0
    End If
    Exit Sub
  End If
  If cur = fs(sel) Then
    ' Space on its own sector: stay
    ft(sel) = -1
    sel = -1 : Blip : CursorInfo : HudText
    Exit Sub
  End If
  Field cur
  If fcache(fbase + fs(sel)) = 255 Then
    Msg "NO WAY THROUGH", 60
    Sfx.Play 0, 400, 0, 10, 4, 0
    Exit Sub
  End If
  f = sel
  If half And fn(f) >= 2 Then
    g = NewFleet(BLUE, fs(f), fn(f) \ 2)
    If g >= 0 Then fn(f) = fn(f) - fn(g) : f = g
  End If
  ft(f) = cur
  sel = -1
  Sfx.Play 0, 90, -2, 13, 10, 0
  Msg "UNDER WAY", 40
  HudText
End Sub

' a fleet's strength: its ships, and the Z-BOMBER's guns
Function Power(ByVal f As Integer) As Integer
  If f = zf Then Power = fn(f) + zpow Else Power = fn(f)
End Function

' ---------------------------------------------------------------- the clock: a frame of the war
Sub Clock()
  Dim f As Integer
  frames = frames + 1
  ' the fleets move
  For f = 0 To fmax - 1
    If fo(f) > 0 Then
      If fx(f) >= 0 Then
        fw(f) = fw(f) - 1
        If fw(f) <= 0 Then Arrive f
      ElseIf ft(f) >= 0 Then
        If ft(f) = fs(f) Then ft(f) = -1 Else StepOut f
      End If
      If result Then Exit Sub
    End If
  Next
  ' the bases build ships
  For k = 1 To 2
    prodN(k) = prodN(k) + 1
    If prodN(k) >= prodT(k) Then prodN(k) = 0 : Build k
  Next
  ' the Z-BOMBER mended
  If zDown > 0 Then
    zDown = zDown - 1
    If zDown = 0 Then ZBack
  End If
  ' the Swarm thinks: a fleet a time
  If (frames And 15) = 0 Then Think
End Sub

' StepOut f: fleet f sets off for the next sector on its way
Sub StepOut(ByVal f As Integer)
  Dim best As Integer, d As Integer, v As Integer, n As Integer, s As Integer
  Field ft(f)
  s = fs(f)
  best = -1 : d = fcache(fbase + s)
  If d = 255 Then ft(f) = -1 : Exit Sub
  ' the neighbour that's nearest (the first one, in Nb's order, when two are)
  v = nbE(s)
  If v < 64 Then
    If fcache(fbase + v) < d Then d = fcache(fbase + v) : best = v
  End If
  v = nbW(s)
  If v < 64 Then
    If fcache(fbase + v) < d Then d = fcache(fbase + v) : best = v
  End If
  v = nbS(s)
  If v < 64 Then
    If fcache(fbase + v) < d Then d = fcache(fbase + v) : best = v
  End If
  v = nbN(s)
  If v < 64 Then
    If fcache(fbase + v) < d Then d = fcache(fbase + v) : best = v
  End If
  If best < 0 Then ft(f) = -1 : Exit Sub
  fx(f) = best
  n = 70
  If mt(best) = T_NEB Or mt(best) = T_ROCK Then n = 140
  If fk(f) Then n = n * 3 \ 2
  If f = zf Then n = n * 4 \ 5
  fw(f) = n : fd(f) = n
End Sub

' Arrive f: fleet f gets to the next sector
Sub Arrive(ByVal f As Integer)
  Dim s As Integer, side As Integer, foe As Integer, g As Integer
  s = fx(f) : fs(f) = s : fx(f) = -1
  side = fo(f) : foe = 3 - side
  ' the enemy here: a battle
  For g = 0 To NF - 1
    If fo(g) = foe And fs(g) = s And fx(g) < 0 Then
      Battle s
      Exit For
    End If
  Next
  If fo(f) = 0 Then Exit Sub
  Claim f
End Sub

' Claim f: fleet f holds its sector: keys, planets, bases; friends join up
Sub Claim(ByVal f As Integer)
  Dim s As Integer, side As Integer, foe As Integer, g As Integer
  s = fs(f) : side = fo(f) : foe = 3 - side
  ' a dropped key: yours goes home, theirs you take
  If ks(side) = 2 And kd(side) = s Then
    ks(side) = 0
    If side = BLUE Then Msg "OUR STAR KEY IS SAFE HOME", 80 Else Msg "THE SWARM TOOK BACK ITS KEY", 80
    Sfx.Play 2, 60, -1, 14, 20, 0
  End If
  If ks(foe) = 2 And kd(foe) = s And fk(f) = 0 Then TakeKey f
  ' their base, their key at home, nobody to stop you
  If s = baseS(foe) And ks(foe) = 0 And fk(f) = 0 Then TakeKey f
  ' home with their key, and yours safe: the sector is won
  If s = baseS(side) And fk(f) = foe And ks(side) = 0 Then
    result = side
    If side = BLUE Then Msg "THE SWARM'S KEY IS OURS!", 0 Else Msg "THE SWARM HAS OUR KEY!", 0
    Sfx.Play 2, 30, 1, 15, 60, 0
    Exit Sub
  End If
  ' a planet
  If mt(s) = T_PLANET And own(s) <> side Then
    own(s) = side : flagsDirty = 1
    If side = BLUE Then Msg "PLANET TAKEN", 50 Else Msg "THE SWARM TAKES A PLANET", 50
    Sfx.Play 1, 100, -3, 12, 12, 0
  End If
  ' friends here that are staying: one fleet
  If ft(f) = s Or ft(f) < 0 Then
    ft(f) = -1
    For g = 0 To NF - 1
      If g <> f And fo(g) = side And fs(g) = s And fx(g) < 0 And ft(g) < 0 And fk(f) = 0 And fk(g) = 0 Then Join f, g
    Next
  End If
End Sub

Sub TakeKey(ByVal f As Integer)
  Dim foe As Integer
  foe = 3 - fo(f)
  ks(foe) = 1 : kf(foe) = f : fk(f) = foe
  If fo(f) = BLUE Then
    Msg "WE HAVE THEIR STAR KEY! GET IT HOME", 100
  Else
    Msg "ALERT: THE SWARM HAS OUR STAR KEY!", 100
  End If
  Sfx.Play 2, 40, -1, 15, 30, 0
End Sub

' Join f, g: fleet g into fleet f
Sub Join(ByVal f As Integer, ByVal g As Integer)
  fn(f) = fn(f) + fn(g)
  If fn(f) > MAXS Then fn(f) = MAXS
  If fk(g) Then fk(f) = fk(g) : kf(fk(g)) = f
  If zf = g Then zf = f
  If sel = g Then sel = f
  fo(g) = 0
End Sub

' Build side: the base's yard: a ship, and one more for every two planets held
Sub Build(ByVal side As Integer)
  Dim f As Integer, n As Integer, s As Integer
  n = 1
  For s = 0 To 63
    If mt(s) = T_PLANET And own(s) = side Then n = n + 1
  Next
  n = 1 + (n - 1) \ 2
  ' no more than the yards can crew: 50 ships (the Swarm: more in each sector)
  s = 0
  For f = 0 To NF - 1
    If fo(f) = side Then s = s + fn(f)
  Next
  If side = RED Then
    If s >= 50 + sector * 6 Then Exit Sub
  ElseIf s >= 50 Then
    Exit Sub
  End If
  ' to the guard at the base (not a fleet carrying a key: that one has to go on fighting for it)
  For f = 0 To NF - 1
    If fo(f) = side And fs(f) = baseS(side) And fx(f) < 0 And ft(f) < 0 And fk(f) = 0 Then
      fn(f) = fn(f) + n
      If fn(f) > MAXS Then fn(f) = MAXS
      Exit Sub
    End If
  Next
  f = NewFleet(side, baseS(side), n)
End Sub

' the Z-BOMBER mended: back at the base
Sub ZBack()
  Dim f As Integer
  zhp = zmax
  For f = 0 To NF - 1
    If fo(f) = BLUE And fs(f) = baseS(BLUE) And fx(f) < 0 And ft(f) < 0 Then
      zf = f
      Msg "THE Z-BOMBER IS MENDED", 80
      Exit Sub
    End If
  Next
  zf = NewFleet(BLUE, baseS(BLUE), 0)
  Msg "THE Z-BOMBER IS MENDED", 80
End Sub

' ---------------------------------------------------------------- battles
Sub Battle(ByVal s As Integer)
  Dim pb As Integer, pr As Integer, d As Integer, rounds As Integer, f As Integer, zin As Integer
  battles = battles + 1
  zin = 0
  If zf >= 0 Then
    If fs(zf) = s And fx(zf) < 0 Then zin = 1
  End If
  ' the Z-BOMBER's first fight in this sector: the crew combine it
  If zin And combined = 0 Then
    combined = 1
    Talk Data.S_M1COMBINE + (sector - 1) * 4
    Panel
  End If
  Msg "BATTLE! " & CStr(SidePower(s, BLUE)) & " AGAINST " & CStr(SidePower(s, RED)), 0
  Bang s, 60
  rounds = 0
  Do
    pb = SidePower(s, BLUE) : pr = SidePower(s, RED)
    If pb <= 0 Or pr <= 0 Then Exit Do
    ' a base's guns help whoever's home
    If s = baseS(BLUE) Then pb = pb + 4
    If s = baseS(RED) Then pr = pr + 6
    d = pr * (25 + Rnd(25)) \ 100
    If d < 1 Then d = 1
    Lose s, BLUE, d
    d = pb * (25 + Rnd(25)) \ 100
    If d < 1 Then d = 1
    Lose s, RED, d
    rounds = rounds + 1
  Loop
  pb = SidePower(s, BLUE)
  If pb > 0 Then
    Msg "WE WON: " & CStr(pb) & " LEFT", 90
    Sfx.Play 2, 80, -2, 14, 20, 0
  Else
    Msg "WE LOST THE BATTLE", 90
    Sfx.Play 2, 400, 6, 14, 30, 0
  End If
  ' the losers' fleets are gone (their keys dropped here)
  For f = 0 To NF - 1
    If fo(f) > 0 And fs(f) = s And fx(f) < 0 Then
      If fn(f) <= 0 And f <> zf Then Gone f
    End If
  Next
  ' the winners hold the sector
  For f = 0 To NF - 1
    If fo(f) > 0 And fs(f) = s And fx(f) < 0 Then Claim f : Exit For
  Next
End Sub

' how strong a side is in sector s (fleets that are there, not passing)
Function SidePower(ByVal s As Integer, ByVal side As Integer) As Integer
  Dim f As Integer, p As Integer
  p = 0
  For f = 0 To NF - 1
    If fo(f) = side And fs(f) = s And fx(f) < 0 Then p = p + Power(f)
  Next
  SidePower = p
End Function

' Lose s, side, d: that side loses d in sector s: ships first, then the Z-BOMBER's hull
Sub Lose(ByVal s As Integer, ByVal side As Integer, ByVal d As Integer)
  Dim f As Integer, n As Integer
  For f = 0 To NF - 1
    If d > 0 And fo(f) = side And fs(f) = s And fx(f) < 0 Then
      n = fn(f)
      If n > d Then n = d
      fn(f) = fn(f) - n : d = d - n
    End If
  Next
  If d > 0 And side = BLUE And zf >= 0 Then
    If fs(zf) = s And fx(zf) < 0 Then
      zhp = zhp - d
      If zhp <= 0 Then ZDowned
    End If
  End If
End Sub

' the Z-BOMBER can't take any more: its crew fly the three craft home to be mended
Sub ZDowned()
  Dim f As Integer
  f = zf
  zf = -1 : zhp = 0 : zDown = 900
  Msg "THE Z-BOMBER FALLS BACK TO BE MENDED", 120
  If fn(f) <= 0 Then Gone f
End Sub

' fleet f is gone; a key it carried drops where it was
Sub Gone(ByVal f As Integer)
  Dim k2 As Integer
  k2 = fk(f)
  If k2 Then ks(k2) = 2 : kd(k2) = fs(f) : kf(k2) = -1
  If sel = f Then sel = -1
  fo(f) = 0
End Sub

' the battle's flashes: bangs and lasers round sector s for n frames
Sub Bang(ByVal s As Integer, ByVal n As Integer)
  Dim j As Integer, x As Integer, y As Integer, q As Integer
  x = SX(s) + 32 : y = SY(s) + 32
  For j = 1 To n
    q = SP_FX + (j And 7)
    If (j And 1) Then
      Spr.Put q, x - 16 + Rnd(24), y - 18 + Rnd(16), GfxData.S_BOOM + (j \ 2) Mod 4, 0
    Else
      Spr.Put q, x - 12 + Rnd(16), y - 16 + Rnd(12), GfxData.S_LASER, Spr.Pal * Rnd(2)
    End If
    If (j And 7) = 0 Then Sfx.Play 1, 500 + Rnd(800), 30, 13, 10, 1
    If (j And 3) = 0 Then Sfx.Play 0, 30 + Rnd(30), 3, 11, 6, 0
    DrawAll
    Tick
  Next
  Spr.HideRange SP_FX, 8
  Spr.Show                              ' (the hidden flashes go out once ...)
  Spr.Trim SP_FL + fmax * 4             ' ... and then aren't sent every frame any more
End Sub

' ---------------------------------------------------------------- the IRON SWARM's mind
' Think: one of its fleets decides what to do
Sub Think()
  Dim f As Integer, j As Integer, g As Integer, b As Integer, d As Integer, s As Integer
  aiN = (aiN + 1) And 15
  f = aiN
  If fo(f) <> RED Then Exit Sub
  ' carrying our key: home
  If fk(f) = BLUE Then ft(f) = baseS(RED) : Exit Sub
  ' our key dropped somewhere: get it
  If ks(BLUE) = 2 Then ft(f) = kd(BLUE) : Exit Sub
  ' its key dropped: get it back
  If ks(RED) = 2 Then ft(f) = kd(RED) : Exit Sub
  ' we have its key: everyone after the carrier (the guards stay unless it's close)
  If ks(RED) = 1 Then
    g = kf(RED)
    If fs(f) = baseS(RED) And fx(f) < 0 Then
      ' the guard sends all it can spare after the carrier
      If fn(f) >= garMin + 3 Then
        j = NewFleet(RED, fs(f), fn(f) - garMin)
        If j >= 0 Then fn(f) = garMin : ft(j) = fs(g)
      End If
      If Far(fs(g), baseS(RED)) <= 3 Then ft(f) = fs(g)
      Exit Sub
    End If
    ft(f) = fs(g) : Exit Sub
  End If
  ' the guard at home: big enough? send a raid out, keep the guard
  If fs(f) = baseS(RED) And fx(f) < 0 Then
    ' danger near home: stay
    For g = 0 To NF - 1
      If fo(g) = BLUE And Far(fs(g), baseS(RED)) <= 2 Then Exit Sub
    Next
    If fn(f) >= garMin + 3 Then
      g = NewFleet(RED, fs(f), fn(f) - garMin)
      If g >= 0 Then
        fn(f) = garMin
        ft(g) = Goal(g)
      End If
    End If
    Exit Sub
  End If
  ' us near its base: anyone close by comes home to help
  If Far(fs(f), baseS(RED)) <= 4 And fk(f) = 0 Then
    For g = 0 To NF - 1
      If fo(g) = BLUE And Far(fs(g), baseS(RED)) <= 2 Then ft(f) = baseS(RED) : Exit Sub
    Next
  End If
  ' out in the sector with nothing to do: pick something
  If ft(f) < 0 Then ft(f) = Goal(f)
End Sub

' Goal(f): where a Swarm fleet goes: big enough, our base (and our key); else a planet it
' hasn't got; else home
Function Goal(ByVal f As Integer) As Integer
  Dim s As Integer, b As Integer, d As Integer
  If fn(f) >= raid Then Goal = baseS(BLUE) : Exit Function
  b = -1 : d = 99
  For s = 0 To 63
    If mt(s) = T_PLANET And own(s) <> RED Then
      If Far(s, fs(f)) < d Then d = Far(s, fs(f)) : b = s
    End If
  Next
  If b >= 0 Then Goal = b Else Goal = baseS(BLUE)
End Function

' ---------------------------------------------------------------- drawing
Sub DrawAll()
  Dim f As Integer, x As Integer, y As Integer, s As Integer, n As Integer, p As Integer, fl As Integer, q As Integer
  Dim a1 As Integer, a6 As Integer, a12 As Integer, aw As Integer, w As Integer, tt As Integer, mv As Integer
  ' the animation phases of this frame, worked out once (the divisions are the slow part)
  a1 = (frames \ 6) And 1 : a6 = a1 + a1 : a12 = (frames \ 12) And 1 : aw = a1 * 6400
  ' the cursor
  x = sxT(cur) + 16 : y = syT(cur) + 24
  p = GfxData.S_CURSOR
  If sel < 0 And (frames And 8) <> 0 Then p = GfxData.S_CURSOR + 2
  Spr.Put SP_CUR, x, y, p, 0
  Spr.Put SP_CUR + 1, x + 16, y, p + 1, 0
  ' the picked fleet
  If sel >= 0 Then
    s = fs(sel)
    Spr.Put SP_PICK, sxT(s) + 16, syT(s) + 24, GfxData.S_PICK, 0
    Spr.Put SP_PICK + 1, sxT(s) + 32, syT(s) + 24, GfxData.S_PICK + 1, 0
  Else
    Spr.HideRange SP_PICK, 2
  End If
  ' planets' flags (only when one changed hands, or the sprites were cleared)
  If flagsDirty Then DrawFlags
  ' the fleets (only the slots in use; a standing fleet is drawn again only when something about it
  ' changed: where, how many, which kind, the animation frame)
  q = SP_FL
  For f = 0 To fmax - 1
    If fo(f) > 0 Then
      s = fs(f)
      x = sxT(s) : y = syT(s)
      If fx(f) >= 0 Then
        ' on the way: between the two sectors (a step is 16 across and 8 down, one way or the other)
        tt = fd(f) - fw(f) : n = fd(f) : s = fx(f)
        w = (16 * tt) \ n
        If sxT(s) < x Then x = x - w Else x = x + w
        w = (8 * tt) \ n
        If syT(s) < y Then y = y - w Else y = y + w
        mv = 1                                  ' (moving: drawn every frame)
        w = -1
      Else
        mv = 0
        n = fn(f)
        If fo(f) = RED Then
          w = fs(f) + n64(n) + aw + 25600
        ElseIf f = zf Then
          w = fs(f) + n64(n) + aw + 12800
        Else
          w = fs(f) + n64(n) + aw
        End If
      End If
      fix(f) = x : fiy(f) = y                 ' (a key it carries goes with it)
      If mv Or w <> fstamp(f) Or fShown(f) = 0 Then
        fstamp(f) = w
        ' a second fleet of the same side in a sector: a little to the side
        If fo(f) = RED Then x = x + 4 : y = y - 2 Else x = x - 4 : y = y + 2
        fl = 0
        If fo(f) = RED Then fl = Spr.Pal
        If f = zf Then
          Spr.Put q, x + 16, y + 20, GfxData.S_ZB + a6, 0
          Spr.Put q + 1, x + 32, y + 20, GfxData.S_ZB + 1 + a6, 0
        ElseIf fo(f) = BLUE Then
          Spr.Put q, x + 24, y + 20, GfxData.S_FRIGATE + a1, 0
          Spr.Hide q + 1
        Else
          Spr.Put q, x + 24, y + 20, GfxData.S_DRONE + a1, fl
          Spr.Hide q + 1
        End If
        n = fn(f)
        If n >= 10 Then Spr.Put q + 2, x + 23, y + 30, dgT(n), 0 Else Spr.Hide q + 2
        If n > 0 Or f <> zf Then Spr.Put q + 3, x + 30, y + 30, dgU(n), 0 Else Spr.Hide q + 3
        fShown(f) = 1
      End If
    ElseIf fShown(f) Then
      Spr.HideRange q, 4
      fShown(f) = 0
    End If
    q = q + 4
  Next
  ' the keys: at home on the base, carried over the fleet, or floating where they fell
  For k = 1 To 2
    s = -1
    If ks(k) = 0 Then s = baseS(k)
    If ks(k) = 2 Then s = kd(k)
    If s >= 0 Then
      x = sxT(s) + 24 : y = syT(s) + 2
      If (frames And 8) <> 0 Then y = y - 1
    Else
      f = kf(k)
      x = fix(f) + 24 : y = fiy(f) + 4
    End If
    fl = 0
    If k = 2 Then fl = Spr.Pal
    Spr.Put SP_KEY + k - 1, x, y, GfxData.S_KEY + a12, fl
  Next
  ' where the picked fleet (or the one under the cursor) is going
  f = sel
  If f < 0 Then f = FleetAt(cur)
  If f >= 0 Then
    If ft(f) >= 0 Then
      s = ft(f)
      Spr.Put SP_TGT, sxT(s) + 24, syT(s) + 6 + ((frames And 12) \ 4), GfxData.S_TARGET, 0
    Else
      Spr.Hide SP_TGT
    End If
  Else
    Spr.Hide SP_TGT
  End If
End Sub

' DrawFlags: a flag on every planet that's held (the sprites keep what they were given)
Sub DrawFlags()
  Dim s As Integer, n As Integer
  flagsDirty = 0
  n = 0
  For s = 0 To 63
    If mt(s) = T_PLANET And n < 16 Then
      If own(s) Then Spr.Put SP_FLAG + n, sxT(s) + 34, syT(s) + 4, GfxData.S_FLAG, Spr.Pal * (own(s) - 1) Else Spr.Hide SP_FLAG + n
      n = n + 1
    End If
  Next
End Sub

' one of your fleets in sector s (-1 none)
Function FleetAt(ByVal s As Integer) As Integer
  Dim f As Integer
  For f = 0 To fmax - 1
    If fo(f) = BLUE And fs(f) = s Then FleetAt = f : Exit Function
  Next
  FleetAt = -1
End Function

' ---------------------------------------------------------------- the panel
Sub Panel()
  Tiles.Fill 0
  Tiles.Rect 0, 0, 40, 4, GfxData.T_PANEL
  Tiles.Rect 0, 3, 40, 1, GfxData.T_PANELB
  Tiles.Rect 0, 27, 40, 5, GfxData.T_PANEL
  Tiles.Rect 0, 27, 40, 1, GfxData.T_PANELT
  Tiles.Text 1, 1, "SECTOR " & CStr(sector) & ": " & mapName
  HudText
  CursorInfo
  Tiles.Text 1, 30, "QAOP MOVE  SPACE PICK, SEND  M HALF"
End Sub

Sub HudText()
  Dim f As Integer, nb As Integer, nr As Integer
  nb = 0 : nr = 0
  For f = 0 To NF - 1
    If fo(f) = BLUE Then nb = nb + fn(f)
    If fo(f) = RED Then nr = nr + fn(f)
  Next
  Tiles.Rect 0, 2, 40, 1, GfxData.T_PANEL
  Tiles.Put 1, 2, GfxData.T_SHIPB
  Tiles.Text 2, 2, Right$("  " & CStr(nb), 3)
  Tiles.Put 6, 2, GfxData.T_SHIPR
  Tiles.Text 7, 2, Right$("  " & CStr(nr), 3)
  Tiles.Put 12, 2, GfxData.T_KEYB
  Tiles.Text 13, 2, KeyWord(BLUE)
  Tiles.Put 21, 2, GfxData.T_KEYR
  Tiles.Text 22, 2, KeyWord(RED)
  If zf >= 0 Then
    Tiles.Text 30, 2, "Z " & Right$(" " & CStr(zhp), 2) & "/" & CStr(zmax)
  Else
    Tiles.Text 30, 2, "Z MENDING"
  End If
  Tiles.Text 30, 1, "TRIES " & CStr(tries)
  If sel >= 0 Then
    If half Then Tiles.Text 30, 0, "SEND HALF" Else Tiles.Text 30, 0, "SEND ALL "
  Else
    Tiles.Rect 30, 0, 9, 1, GfxData.T_PANEL
  End If
End Sub

Function KeyWord(ByVal side As Integer) As String
  Select Case ks(side)
    Case 0 : KeyWord = "HOME  "
    Case 1 : KeyWord = "TAKEN "
    Case Else : KeyWord = "LOST  "
  End Select
End Function

' what's under the cursor, in the panel at the bottom
Sub CursorInfo()
  Dim s As Integer, f As Integer, nb As Integer, nr As Integer, z As Integer
  If msgT > 0 Then Exit Sub
  s = cur
  Select Case mt(s)
    Case T_NEB : info = "A NEBULA: SLOW GOING"
    Case T_ROCK : info = "ASTEROIDS: SLOW GOING"
    Case T_RIFT : info = "A RIFT: NOTHING GETS THROUGH"
    Case T_BLUE : info = "OUR BASE"
    Case T_RED : info = "THE IRON SWARM'S BASE"
    Case T_PLANET
      If own(s) = BLUE Then
        info = "A PLANET: OURS"
      ElseIf own(s) = RED Then
        info = "A PLANET: THE SWARM'S"
      Else
        info = "A PLANET: NOBODY'S"
      End If
    Case Else : info = "OPEN SPACE"
  End Select
  Tiles.Rect 1, 28, 38, 2, GfxData.T_PANEL
  Tiles.Text 1, 28, info
  nb = 0 : nr = 0 : z = 0
  For f = 0 To NF - 1
    If fs(f) = s And fx(f) < 0 Then
      If fo(f) = BLUE Then nb = nb + fn(f)
      If fo(f) = RED Then nr = nr + fn(f)
      If f = zf Then z = 1
    End If
  Next
  txt = ""
  If nb > 0 Or z Then txt = CStr(nb) & " FRIGATES"
  If z Then txt = txt & " + THE Z-BOMBER"
  If nr > 0 Then txt = CStr(nr) & " SWARM DRONES"
  Tiles.Text 1, 29, txt
End Sub

' Msg s, t: a line in the bottom panel for t frames (0: until the next)
Sub Msg(ByVal s As String, ByVal t As Integer)
  Tiles.Rect 1, 28, 38, 2, GfxData.T_PANEL
  Tiles.Text 1, 28, s
  If t = 0 Then msgT = 30000 Else msgT = t
  If sel >= 0 And t = 0 Then msgT = 0
End Sub

' ---------------------------------------------------------------- the title and the end
Sub Title()
  Dim y As Integer, v As Integer
  Spr.HideRange 0, 128
  Sky
  Tiles.Fill 0
  Tiles.Text 16, 6, "Z-BOMBER"
  Tiles.Text 9, 8, "CAPTURE THE STAR KEYS"
  Tiles.Text 7, 20, "PRESS SPACE TO TAKE COMMAND"
  Tiles.Text 4, 24, "QAOP MOVE THE CURSOR A SECTOR"
  Tiles.Text 4, 25, "SPACE PICK A FLEET, SPACE AGAIN"
  Tiles.Text 4, 26, "      TO SEND IT   M: ALL / HALF"
  Tiles.Text 4, 29, "(C) 2026 CYBORG UNICORN PTY LTD"
  y = 0
  Do
    y = y + 1
    ' the Z-BOMBER, four times the size, flying across
    t = (y \ 2) Mod 256
    Spr.Put 0, t, 96 + (y \ 16) Mod 2, GfxData.S_ZB + ((y \ 6) And 1) * 2, Spr.Scale4
    If t + 64 < 320 Then Spr.Put 1, t + 64, 96 + (y \ 16) Mod 2, GfxData.S_ZB + 1 + ((y \ 6) And 1) * 2, Spr.Scale4 Else Spr.Hide 1
    Tick
    v = Key()
  Loop Until v = 5 And y > 20
  Spr.HideRange 0, 2
  If Len(pName) = 0 Then NameEntry
  Tiles.Fill 0
End Sub

' the Captain's name
Sub NameEntry()
  Dim v As Integer, cx As Integer, cy As Integer, s As String
  Tiles.Fill 0
  Tiles.Rect 3, 8, 34, 14, GfxData.T_PANEL
  Tiles.Text 5, 9, "YOUR NAME, CAPTAIN:"
  cx = 0 : cy = 0
  Do
    Tiles.Rect 25, 9, 10, 1, GfxData.T_PANEL
    Tiles.Text 25, 9, pName
    For t = 0 To 29
      If t < 26 Then s = Chr$(65 + t)
      If t = 26 Then s = "-"
      If t = 27 Then s = "<-"
      If t = 28 Then s = "OK"
      If t = 29 Then s = "."
      If (t Mod 8) = cx And (t \ 8) = cy Then s = ">" & s Else s = " " & s
      Tiles.Text 5 + (t Mod 8) * 4, 12 + (t \ 8) * 2, Left$(s & "   ", 4)
    Next
    Do
      Tick
      v = Key()
    Loop Until v
    If v = 1 And cy > 0 Then cy = cy - 1
    If v = 2 And cy < 3 Then cy = cy + 1
    If v = 3 And cx > 0 Then cx = cx - 1
    If v = 4 And cx < 7 Then cx = cx + 1
    If cy * 8 + cx > 29 Then cx = 29 - cy * 8
    If v = 5 Then
      t = cy * 8 + cx
      Blip
      If t < 26 And Len(pName) < 8 Then pName = pName & Chr$(65 + t)
      If t = 26 And Len(pName) < 8 Then pName = pName & "-"
      If t = 29 And Len(pName) < 8 Then pName = pName & "."
      If t = 27 And Len(pName) > 0 Then pName = Left$(pName, Len(pName) - 1)
      If t = 28 And Len(pName) > 0 Then Exit Do
    End If
    If v = 6 And Len(pName) > 0 Then Exit Do
  Loop
  Tiles.Fill 0
End Sub

Sub TheEnd()
  Dim v As Integer
  Spr.HideRange 0, 128
  Tiles.Fill 0
  Tiles.Rect 6, 8, 28, 13, GfxData.T_PANEL
  If result = BLUE And sector = 5 Then Tiles.Text 12, 9, "THE WAR IS WON" Else Tiles.Text 12, 9, "THE WAR IS LOST"
  Tiles.Text 8, 12, "CAPTAIN " & pName
  Tiles.Text 8, 14, "SECTORS WON  " & CStr(won)
  Tiles.Text 8, 15, "SECTORS LOST " & CStr(lost)
  Tiles.Text 8, 16, "BATTLES      " & CStr(battles)
  Tiles.Text 8, 17, "Z-BOMBER REFITS " & CStr(refit)
  Tiles.Text 10, 19, "PRESS SPACE"
  Do
    Tick
    v = Key()
  Loop Until v = 5
  battles = 0
  Tiles.Fill 0
End Sub

' ---------------------------------------------------------------- the keys, the frame
Function Key() As Integer
  Dim j As Integer, v As Integer, f2 As Integer
  j = Keys.Joystick(0)
  v = 0
  If Keys.Down(Keys.KeyQ) Or (j And Keys.JoyUp) Then v = 1
  If Keys.Down(Keys.KeyA) Or (j And Keys.JoyDown) Then v = 2
  If Keys.Down(Keys.KeyO) Or (j And Keys.JoyLeft) Then v = 3
  If Keys.Down(Keys.KeyP) Or (j And Keys.JoyRight) Then v = 4
  f2 = 0
  If Keys.Down(Keys.KeySpace) Or (j And Keys.JoyFire1) Then f2 = 5
  If Keys.Down(Keys.KeyM) Or (j And Keys.JoyFire2) Then f2 = 6
  If f2 Then
    If firWas = 0 Then firWas = f2 : Key = f2 : Exit Function
    Key = 0 : Exit Function
  End If
  firWas = 0
  If v = 0 Then keyT = 0 : Key = 0 : Exit Function
  If keyT = 0 Then
    keyT = 14 : Key = v
  Else
    keyT = keyT - 1
    If keyT = 0 Then keyT = 6 : Key = v Else Key = 0
  End If
End Function

Sub Tick()
  Frame
  Spr.Show
  Sfx.Update
End Sub

Sub WaitF(ByVal t As Integer)
  Dim j As Integer
  For j = 1 To t
    Tick
  Next
End Sub

Sub Blip()
  Sfx.Play 0, 120, -2, 12, 6, 0
End Sub

' ---------------------------------------------------------------- people
Sub LoadRec(ByVal p As Integer)
  If recOf = p Then Exit Sub
  Data.Copy Data.PPAGE, Data.POFF + p * 32, 32, VarPtr(rec)
  recOf = p
End Sub

' a cast member's name (the Captain: the name typed in)
Function CName(ByVal c As Integer) As String
  Dim s As String, j As Integer
  If c < 0 Then CName = "" : Exit Function
  If c = K_YOU Then CName = "CAPTAIN " & pName : Exit Function
  LoadRec c
  s = ""
  For j = 24 To 31
    If rec(j) <> 32 Then s = s & Chr$(rec(j))
  Next
  If c = K_YOON Then s = "DR YOON"
  CName = s
End Function

' ---------------------------------------------------------------- a talk
' into a talk: the board stays behind, the faces' patterns in
Sub TalkOn()
  talking = 1
  Spr.HideRange 0, 128
  Spr.Show
  Tiles.Fill 0
  FaceSet.Load Data.FACEPAGE
  faceOn = -2
End Sub

' out of a talk: the game's sprites back
Sub TalkOff()
  talking = 0
  Spr.HideRange 0, 128
  Spr.Show
  Tiles.Fill 0
  GameSet.Load Data.GAMEPAGE
  flagsDirty = 1                        ' (the sprites were cleared: the flags go up again)
  For i = 0 To 15
    fstamp(i) = -1 : fShown(i) = 0      ' ... and every fleet is drawn again
  Next
End Sub

Sub Talk(ByVal id As Integer)
  TalkOn
  Play id
  TalkOff
End Sub

' cast member c's face, big, on the right (mouth mo, -1 their own); c -1: none
Sub ShowFace(ByVal c As Integer, ByVal mo As Integer)
  If c < 0 Then
    Face.Hide 0
  Else
    Face.Put 0, VarPtr(cLook) + c * 9, 160, 36, 4, mo, 0
  End If
  faceOn = c
End Sub

Sub TextBox(ByVal nm As String)
  Tiles.Rect 1, 23, 38, 8, GfxData.T_PANEL
  Tiles.Rect 1, 22, 38, 1, GfxData.T_PANELT
  If Len(nm) Then Tiles.Text 3, 22, " " & nm & " "
End Sub

' a token's name: 1 the Captain, 2 whoever is speaking, 4 the sector
Function TokName(ByVal b As Integer) As String
  Select Case b
    Case 1
      TokName = pName
    Case 2
      TokName = CName(spk)
    Case Else
      TokName = mapName
  End Select
End Function

' prints lb at row y, col 3: names in for the tokens; typing it out unless fast
Sub PrintLB(ByVal y As Integer)
  Dim x As Integer, j As Integer, b As Integer, s As String, m As Integer, q As Integer
  x = 3 : j = 0
  Do
    b = lb(j)
    If b = 0 Then Exit Do
    If b < 8 Then
      s = TokName(b)
      For m = 1 To Len(s)
        Tiles.Put x, y, Asc(Mid$(s, m, 1)) : x = x + 1
      Next
    Else
      Tiles.Put x, y, b : x = x + 1
    End If
    j = j + 1
    If fast = 0 Then
      q = q + 1
      If (q And 1) = 0 Then
        Tick
        If Key() >= 5 Then fast = 1
      End If
    End If
  Loop
End Sub

Function LBStr() As String
  Dim s As String, j As Integer
  s = "" : j = 0
  Do While lb(j)
    If lb(j) < 8 Then s = s & TokName(lb(j)) Else s = s & Chr$(lb(j))
    j = j + 1
  Loop
  LBStr = s
End Function

' a scene; picked: the last choice's option (1, 2)
Sub Play(ByVal id As Integer)
  Dim pc As Integer, op As Integer, ln As Integer, src As Integer, v As Integer, nopt As Integer, c As Integer
  spk = -1 : picked = 0
  ln = id * 5
  Data.Copy Data.DIRPAGE + ln \ 8192, ln And 8191, 5, VarPtr(de8)
  ln = de8(3) + de8(4) * 256
  If ln = 0 Then Exit Sub
  Data.Copy de8(0), de8(1) + de8(2) * 256, ln, VarPtr(sb)
  pc = 0
  Do
    op = sb(pc)
    Select Case op
      Case Data.OP_END
        Exit Do
      Case Data.OP_SAY, Data.OP_NARR
        If op = Data.OP_SAY And spk >= 0 Then TextBox CName(spk) Else TextBox ""
        src = VarPtr(sb) + pc + 1
        fast = 0 : t = 0
        Do
          src = Data.Expand(src, VarPtr(lb))
          PrintLB 24 + t
          t = t + 1
        Loop Until Data.Term() = 0
        pc = src - VarPtr(sb)
        WaitGo
      Case Data.OP_WHO
        v = sb(pc + 1)
        If v >= 8 Then spk = -1 Else spk = v
        If faceOn <> spk Then ShowFace spk, -1
        pc = pc + 2
      Case Data.OP_MOOD
        If spk >= 0 Then ShowFace spk, sb(pc + 1)
        pc = pc + 2
      Case Data.OP_ICON
        If sb(pc + 1) = 9 Then Sfx.Play 1, 300, 20, 12, 20, 0 Else Sfx.Play 1, 80, -3, 12, 12, 0
        pc = pc + 2
      Case Data.OP_AFF, Data.OP_FLAG
        pc = pc + 2
      Case Data.OP_STAT, Data.OP_MONEY
        pc = pc + 3
      Case Data.OP_CHOICE
        nopt = sb(pc + 1)
        src = VarPtr(sb) + pc + 2
        For t = 0 To nopt - 1
          src = Data.Expand(src, VarPtr(lb))
          txt = LBStr()
          If t = 0 Then lab0 = txt
          If t = 1 Then lab1 = txt
        Next
        pc = src - VarPtr(sb)
        c = Choose()
        picked = c + 1
        pc = sb(pc + c * 2) + sb(pc + c * 2 + 1) * 256
      Case Data.OP_GOTO
        pc = sb(pc + 1) + sb(pc + 2) * 256
      Case Else
        Exit Do
    End Select
  Loop
  Tiles.Rect 0, 22, 40, 10, 0
  Face.Hide 0
End Sub

' wait for Space after a page
Sub WaitGo()
  Dim v As Integer
  Do
    Tick
    If (frames And 16) Then Tiles.Put 36, 29, 62 Else Tiles.Put 36, 29, GfxData.T_PANEL
    frames = frames + 1
    v = Key()
  Loop Until v >= 5
  Blip
End Sub

' the two options (lab0, lab1): 0 or 1
Function Choose() As Integer
  Dim sel2 As Integer, v As Integer
  TextBox "CAPTAIN " & pName
  Tiles.Text 3, 23, "YOUR ORDERS?"
  sel2 = 0
  Do
    For t = 0 To 1
      If t = sel2 Then Tiles.Text 3, 25 + t * 2, ">" Else Tiles.Text 3, 25 + t * 2, " "
    Next
    Tiles.Text 5, 25, lab0
    Tiles.Text 5, 27, lab1
    Do
      Tick
      v = Key()
    Loop Until v
    If (v = 1 Or v = 3) And sel2 > 0 Then sel2 = 0 : Blip
    If (v = 2 Or v = 4) And sel2 < 1 Then sel2 = 1 : Blip
  Loop Until v = 5
  Sfx.Play 0, 90, -2, 13, 10, 0
  Choose = sel2
End Function

import { useEffect, useState } from 'react'
import './App.css'
import { request } from './lib/api.js'

const TOKEN_KEY = 'software-team-token'
const USER_KEY = 'software-team-user'

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem(USER_KEY)
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeView, setActiveView] = useState('Resumen')
  const [team, setTeam] = useState([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  const [teamError, setTeamError] = useState('')
  const [projects, setProjects] = useState([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [tasks, setTasks] = useState([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [tasksError, setTasksError] = useState('')
  const [taskFilter, setTaskFilter] = useState('Todas')
  const [isCreating, setIsCreating] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [editingMember, setEditingMember] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState('TODOS')

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setIsCheckingSession(false)
        return
      }

      try {
        const currentUser = await request('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUser(currentUser)
        if (['PROGRAMADOR', 'DISEÑADOR'].includes(currentUser.role)) setActiveView('Tareas')
        sessionStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      } catch {
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setIsCheckingSession(false)
      }
    }

    restoreSession()
  }, [token])

  useEffect(() => {
    if (!['Resumen', 'Equipo', 'Tareas'].includes(activeView) || !token) return

    async function loadTeam() {
      setIsLoadingTeam(true)
      setTeamError('')
      try {
        setTeam(await request('/api/v1/users', {
          headers: { Authorization: `Bearer ${token}` },
        }))
      } catch (loadError) {
        setTeamError(loadError.message)
      } finally {
        setIsLoadingTeam(false)
      }
    }

    loadTeam()
  }, [activeView, token])

  useEffect(() => {
    const canReviewTasks = ['LIDER', 'ADMINISTRADOR'].includes(user?.role)
    if ((!['Tareas', 'Revisión'].includes(activeView) && !canReviewTasks) || !token) return

    async function loadTasks() {
      setIsLoadingTasks(true)
      setTasksError('')
      try {
        setTasks(await request('/api/v1/tasks', {
          headers: { Authorization: `Bearer ${token}` },
        }))
      } catch (loadError) {
        setTasksError(loadError.message)
      } finally {
        setIsLoadingTasks(false)
      }
    }

    loadTasks()
  }, [activeView, token, user?.role])

  useEffect(() => {
    if (!['Proyectos', 'Tareas'].includes(activeView) || !token) return

    async function loadProjects() {
      setIsLoadingProjects(true)
      setProjectsError('')
      try {
        setProjects(await request('/api/v1/projects', {
          headers: { Authorization: `Bearer ${token}` },
        }))
      } catch (loadError) {
        setProjectsError(loadError.message)
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadProjects()
  }, [activeView, token])

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    try {
      const result = await request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      })
      sessionStorage.setItem(TOKEN_KEY, result.token)
      sessionStorage.setItem(USER_KEY, JSON.stringify(result.user))
      setToken(result.token)
      setUser(result.user)
      if (['PROGRAMADOR', 'DISEÑADOR'].includes(result.user.role)) setActiveView('Tareas')
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    try {
      if (token) {
        await request('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } finally {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
  }

  async function handleCreateProject(event) {
    event.preventDefault()
    setIsCreating(true)
    const form = event.currentTarget
    try {
      const formData = new FormData(form)
      const project = await request('/api/v1/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formData.get('name'), description: formData.get('description'), leaderId: formData.get('leaderId') || null, memberIds: formData.getAll('memberIds') }),
      })
      setProjects((currentProjects) => [...currentProjects, project])
      form.reset()
    } catch (createError) {
      setProjectsError(createError.message)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault()
    setIsCreating(true)
    const form = event.currentTarget
    try {
      const formData = new FormData(form)
      const task = await request('/api/v1/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: formData.get('title'), description: formData.get('description'), projectId: formData.get('projectId') || null, assigneeId: formData.get('assigneeId') || null }),
      })
      setTasks((currentTasks) => [...currentTasks, task])
      form.reset()
    } catch (createError) {
      setTasksError(createError.message)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteProject(projectId) {
    if (!window.confirm('¿Eliminar este proyecto?')) return
    try {
      await request(`/api/v1/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId))
    } catch (deleteError) {
      setProjectsError(deleteError.message)
    }
  }

  async function handleToggleTask(task) {
    const isWorker = ['PROGRAMADOR', 'DISEÑADOR'].includes(user.role)
    const status = isWorker
      ? (task.status === 'PENDING_REVIEW' ? 'IN_PROGRESS' : 'PENDING_REVIEW')
      : (task.status === 'PENDING_REVIEW' ? 'COMPLETED' : task.status === 'COMPLETED' ? 'TODO' : 'PENDING_REVIEW')
    try {
      const updatedTask = await request(`/api/v1/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      setTasks((currentTasks) => currentTasks.map((item) => item.id === updatedTask.id ? updatedTask : item))
    } catch (updateError) {
      setTasksError(updateError.message)
    }
  }

  async function handleReviewDecision(task, status) {
    const reason = status === 'IN_PROGRESS' ? window.prompt('Indica el motivo de la devolución') : ''
    if (status === 'IN_PROGRESS' && !reason?.trim()) return
    try {
      const updatedTask = await request(`/api/v1/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reason }),
      })
      setTasks((currentTasks) => currentTasks.map((item) => item.id === updatedTask.id ? updatedTask : item))
    } catch (reviewError) {
      setTasksError(reviewError.message)
    }
  }

  async function handleUpdateTask(event) {
    event.preventDefault()
    const form = event.currentTarget
    try {
      const formData = new FormData(form)
      const updatedTask = await request(`/api/v1/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          projectId: formData.get('projectId') || null,
          assigneeId: formData.get('assigneeId') || null,
        }),
      })
      setTasks((currentTasks) => currentTasks.map((task) => task.id === updatedTask.id ? updatedTask : task))
      setEditingTask(null)
    } catch (updateError) {
      setTasksError(updateError.message)
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    try {
      await request(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
      if (editingTask?.id === taskId) setEditingTask(null)
    } catch (deleteError) {
      setTasksError(deleteError.message)
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault()
    setIsCreating(true)
    const form = event.currentTarget
    try {
      const formData = new FormData(form)
      const member = await request('/api/v1/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password'), role: formData.get('role'), leaderId: formData.get('leaderId') || null }),
      })
      setTeam((currentTeam) => [...currentTeam, member])
      form.reset()
    } catch (createError) {
      setTeamError(createError.message)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleUpdateUser(event) {
    event.preventDefault()
    const form = event.currentTarget
    try {
      const formData = new FormData(form)
      const member = await request(`/api/v1/users/${editingMember.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), password: formData.get('password'), role: formData.get('role'), leaderId: formData.get('leaderId') || null }),
      })
      setTeam((currentTeam) => currentTeam.map((item) => item.id === member.id ? member : item))
      setEditingMember(null)
    } catch (updateError) {
      setTeamError(updateError.message)
    }
  }

  async function handleToggleUser(member) {
    try {
      const updatedMember = await request(`/api/v1/users/${member.id}/active`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTeam((currentTeam) => currentTeam.map((item) => item.id === updatedMember.id ? updatedMember : item))
    } catch (updateError) {
      setTeamError(updateError.message)
    }
  }

  async function handleDeleteUser(member) {
    if (!window.confirm(`¿Eliminar a ${member.name}?`)) return
    try {
      await request(`/api/v1/users/${member.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setTeam((currentTeam) => currentTeam.filter((item) => item.id !== member.id))
    } catch (deleteError) {
      setTeamError(deleteError.message)
    }
  }

  async function handleUpdateProject(event) {
    event.preventDefault()
    const form = event.currentTarget
    try {
      const formData = new FormData(form)
      const project = await request(`/api/v1/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: formData.get('name'), description: formData.get('description'), status: formData.get('status'), leaderId: formData.get('leaderId') || null, memberIds: formData.getAll('memberIds') }),
      })
      setProjects((currentProjects) => currentProjects.map((item) => item.id === project.id ? project : item))
      setEditingProject(null)
    } catch (updateError) {
      setProjectsError(updateError.message)
    }
  }

  if (isCheckingSession) {
    return <main className="loading-screen">Comprobando sesión...</main>
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="brand-panel">
          <div className="brand-mark" aria-hidden="true">ST</div>
          <p className="eyebrow">Software Team / Pilot</p>
          <h1>El trabajo del equipo, en un solo pulso.</h1>
          <p className="brand-copy">Un espacio tranquilo para que las personas sepan qué importa, qué sigue y dónde pueden aportar.</p>
          <div className="signal-list" aria-label="Características">
            <span><i /> Sesiones seguras</span>
            <span><i /> Un punto de partida claro</span>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-heading">
            <p className="eyebrow">Área privada</p>
            <h2>Bienvenido de nuevo</h2>
            <p>Accede con tu cuenta de administrador para continuar.</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="admin@empresa.com" required />

            <div className="label-row">
              <label htmlFor="password">Contraseña</label>
              <span>Sesión de 8 horas</span>
            </div>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Introduce tu contraseña" required />

            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar al espacio'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="login-footnote">Tu acceso está protegido mediante una sesión temporal.</p>
        </section>
      </main>
    )
  }

  const navigationViews = ['PROGRAMADOR', 'DISEÑADOR'].includes(user.role)
    ? ['Tareas']
    : ['Resumen', 'Equipo', 'Proyectos', 'Tareas', 'Revisión']
  const visibleTeam = team.filter((member) => (
    (memberRoleFilter === 'TODOS' || member.role === memberRoleFilter)
    && `${member.name} ${member.email}`.toLowerCase().includes(memberSearch.toLowerCase())
  ))

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-brand"><span className="brand-mark small" aria-hidden="true">ST</span><span>Software Team</span></div>
        <div className="sidebar-rule" />
        <p className="sidebar-label">Espacio de trabajo</p>
        <nav className="workspace-nav" aria-label="Navegación principal">
          {navigationViews.map((view) => (
            <button className={activeView === view ? 'nav-item active' : 'nav-item'} key={view} type="button" onClick={() => setActiveView(view)}>
              <span className="nav-index">0{navigationViews.indexOf(view) + 1}</span>{view}{view === 'Revisión' && tasks.filter((task) => task.status === 'PENDING_REVIEW').length > 0 && <span className="notification-badge">{tasks.filter((task) => task.status === 'PENDING_REVIEW').length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini"><span className="avatar">{user.name.slice(0, 1)}</span><span><strong>{user.name}</strong><small>Administrador</small></span></div>
          <button className="logout-button" type="button" onClick={handleLogout}>Cerrar sesión <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <section className="workspace-content">
        <header className="workspace-header">
          <p className="eyebrow">{activeView}</p>
          <div className="date-stamp">09 <span>SEP 2026</span></div>
        </header>
        <section className="welcome-section">
          <div>
            <h1>Buenos días, {user.name.split(' ')[0]}.</h1>
            <p className="welcome-copy">Una vista clara del pulso de tu organización. Lo importante, sin ruido.</p>
          </div>
          <span className="status-pill"><i /> Sesión activa</span>
        </section>
        {activeView === 'Equipo' ? (
          <section className="team-section">
            <div className="section-heading"><div><p className="eyebrow">Directorio</p><h2>Personas del equipo</h2></div><span>{visibleTeam.length} de {team.length}</span></div>
            {user.role === 'ADMINISTRADOR' && <form className="quick-create user-create" onSubmit={handleCreateUser}><input name="name" placeholder="Nombre completo" aria-label="Nombre completo" required /><input name="email" type="email" placeholder="Correo electrónico" aria-label="Correo electrónico" required /><input name="password" type="password" placeholder="Contraseña temporal" aria-label="Contraseña temporal" required /><select name="role" aria-label="Rol" defaultValue="PROGRAMADOR"><option value="PROGRAMADOR">Programador</option><option value="LIDER">Líder</option><option value="DISEÑADOR">Diseñador</option></select><select name="leaderId" aria-label="Líder responsable"><option value="">Sin líder</option>{team.filter((member) => member.role === 'LIDER').map((leader) => <option value={leader.id} key={leader.id}>{leader.name}</option>)}</select><button type="submit" disabled={isCreating}>+ {isCreating ? 'Guardando' : 'Crear persona'}</button></form>}
            <div className="directory-filters"><input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar en el equipo" /><select value={memberRoleFilter} onChange={(event) => setMemberRoleFilter(event.target.value)} aria-label="Filtrar por rol"><option value="TODOS">Todos los roles</option><option value="ADMINISTRADOR">Administradores</option><option value="LIDER">Líderes</option><option value="PROGRAMADOR">Programadores</option><option value="DISEÑADOR">Diseñadores</option></select></div>
            {isLoadingTeam && <p className="inline-status">Cargando equipo...</p>}
            {teamError && <p className="form-error" role="alert">{teamError}</p>}
            {!isLoadingTeam && !teamError && <div className="team-list">{visibleTeam.map((member) => editingMember?.id === member.id ? <form className="member-edit-form" key={member.id} onSubmit={handleUpdateUser}><input name="name" defaultValue={member.name} aria-label="Nombre" required /><input name="email" type="email" defaultValue={member.email} aria-label="Email" required /><input name="password" type="password" placeholder="Nueva contraseña (opcional)" aria-label="Nueva contraseña" /><select name="role" defaultValue={member.role} aria-label="Rol"><option value="LIDER">Líder</option><option value="PROGRAMADOR">Programador</option><option value="DISEÑADOR">Diseñador</option></select><select name="leaderId" defaultValue={member.leaderId || ''} aria-label="Líder responsable"><option value="">Sin líder</option>{team.filter((leader) => leader.role === 'LIDER' && leader.id !== member.id).map((leader) => <option value={leader.id} key={leader.id}>{leader.name}</option>)}</select><button type="submit">Guardar</button><button type="button" onClick={() => setEditingMember(null)}>Cancelar</button></form> : <article className="team-row" key={member.id}><span className="avatar">{member.name.slice(0, 1)}</span><span><strong>{member.name}</strong><small>{member.email}</small></span><em>{member.role}</em><b className={member.isActive ? 'active-label' : ''}>{member.isActive ? 'Activo' : 'Inactivo'}</b><span className="row-actions"><button className="row-action" type="button" onClick={() => setEditingMember(member)}>Editar</button>{member.id !== user.id && <button className="row-action" type="button" onClick={() => handleToggleUser(member)}>{member.isActive ? 'Desactivar' : 'Activar'}</button>}{member.id !== user.id && <button className="row-action danger visible-delete" type="button" onClick={() => handleDeleteUser(member)}>Eliminar</button>}</span></article>)}</div>}
          </section>
        ) : activeView === 'Proyectos' ? (
          <section className="project-section">
            <div className="section-heading"><div><p className="eyebrow">Organización</p><h2>Proyectos</h2></div><span>{projects.length} proyecto{projects.length === 1 ? '' : 's'}</span></div>
            <form className="quick-create project-create" onSubmit={handleCreateProject}><input name="name" placeholder="Nombre del nuevo proyecto" aria-label="Nombre del proyecto" required /><input name="description" placeholder="Descripción breve (opcional)" aria-label="Descripción del proyecto" /><select name="leaderId" aria-label="Líder del proyecto"><option value="">Sin líder</option>{team.filter((member) => member.role === 'LIDER').map((leader) => <option value={leader.id} key={leader.id}>{leader.name}</option>)}</select><select name="memberIds" multiple aria-label="Miembros del proyecto">{team.filter((member) => ['PROGRAMADOR', 'DISEÑADOR'].includes(member.role)).map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select><button type="submit" disabled={isCreating}>+ {isCreating ? 'Guardando' : 'Crear proyecto'}</button></form>
            {isLoadingProjects && <p className="inline-status">Cargando proyectos...</p>}
            {projectsError && <p className="form-error" role="alert">{projectsError}</p>}
            {!isLoadingProjects && !projectsError && projects.length === 0 && <div className="empty-module"><span className="empty-module-index">02</span><div><h3>Tu primer proyecto empieza aquí.</h3><p>Aún no hay proyectos registrados. Cuando exista el flujo de creación, aparecerán en este espacio.</p></div></div>}
            {!isLoadingProjects && !projectsError && projects.length > 0 && <div className="project-list">{projects.map((project) => editingProject?.id === project.id ? <form className="project-edit-form" key={project.id} onSubmit={handleUpdateProject}><input name="name" defaultValue={project.name} aria-label="Nombre del proyecto" required /><input name="description" defaultValue={project.description} aria-label="Descripción del proyecto" /><select name="status" defaultValue={project.status} aria-label="Estado del proyecto"><option value="PLANNING">Planificación</option><option value="IN_PROGRESS">En curso</option><option value="COMPLETED">Completado</option></select><select name="leaderId" defaultValue={project.leaderId || ''} aria-label="Líder del proyecto"><option value="">Sin líder</option>{team.filter((member) => member.role === 'LIDER').map((leader) => <option value={leader.id} key={leader.id}>{leader.name}</option>)}</select><select name="memberIds" multiple defaultValue={project.memberIds || []} aria-label="Miembros del proyecto">{team.filter((member) => ['PROGRAMADOR', 'DISEÑADOR'].includes(member.role)).map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select><button type="submit">Guardar</button><button type="button" onClick={() => setEditingProject(null)}>Cancelar</button></form> : <article className="project-row" key={project.id}><span className="project-dot" /><span><strong>{project.name}</strong><small>{project.description || 'Sin descripción'}</small></span><b>{project.status || 'Sin estado'}</b><span className="row-actions"><button className="row-action" type="button" onClick={() => setEditingProject(project)} aria-label={`Editar ${project.name}`}>Editar</button><button className="row-action danger" type="button" onClick={() => handleDeleteProject(project.id)} aria-label={`Eliminar ${project.name}`}>Eliminar</button></span></article>)}</div>}
          </section>
        ) : ['Tareas', 'Revisión'].includes(activeView) ? (
          <section className="task-section">
            <div className="section-heading"><div><p className="eyebrow">{activeView === 'Revisión' ? 'Decisión del líder' : 'Seguimiento'}</p><h2>{activeView === 'Revisión' ? 'Tareas en revisión' : 'Tareas'}</h2></div>{activeView === 'Tareas' && <div className="filter-tabs" role="group" aria-label="Filtrar tareas">{['Todas', 'Pendientes', 'Hechas'].map((filter) => <button className={taskFilter === filter ? 'filter-tab active' : 'filter-tab'} key={filter} type="button" onClick={() => setTaskFilter(filter)}>{filter}</button>)}</div>}</div>
            {activeView === 'Tareas' && !['PROGRAMADOR', 'DISEÑADOR'].includes(user.role) && <form className="quick-create task-create" onSubmit={handleCreateTask}><input name="title" placeholder="Título de la nueva tarea" aria-label="Título de la tarea" required /><input name="description" placeholder="Descripción breve (opcional)" aria-label="Descripción de la tarea" /><select name="projectId" aria-label="Proyecto de la tarea"><option value="">Sin proyecto</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><select name="assigneeId" aria-label="Persona asignada"><option value="">Sin asignar</option>{team.filter((member) => ['PROGRAMADOR', 'DISEÑADOR'].includes(member.role)).map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select><button type="submit" disabled={isCreating}>+ {isCreating ? 'Guardando' : 'Crear tarea'}</button></form>}
            {isLoadingTasks && <p className="inline-status">Cargando tareas...</p>}
            {tasksError && <p className="form-error" role="alert">{tasksError}</p>}
            {activeView === 'Revisión' && !isLoadingTasks && !tasksError && tasks.filter((task) => task.status === 'PENDING_REVIEW').length === 0 && <div className="empty-module"><span className="empty-module-index">04</span><div><h3>No hay tareas para revisar.</h3><p>Cuando un programador o diseñador envíe una tarea, aparecerá aquí para que tomes una decisión.</p></div></div>}
            {activeView !== 'Revisión' && !isLoadingTasks && !tasksError && tasks.length === 0 && <div className="empty-module"><span className="empty-module-index">03</span><div><h3>Todo está despejado.</h3><p>Todavía no hay tareas asignadas. Cuando se creen tareas, podrás seguir su estado desde aquí.</p></div></div>}
            {!isLoadingTasks && !tasksError && tasks.length > 0 && <div className="task-list">{tasks.filter((task) => activeView === 'Revisión' ? task.status === 'PENDING_REVIEW' : taskFilter === 'Todas' || (taskFilter === 'Hechas' ? task.status === 'COMPLETED' : task.status !== 'COMPLETED')).map((task) => editingTask?.id === task.id ? <form className="task-edit-form" key={task.id} onSubmit={handleUpdateTask}><input name="title" defaultValue={task.title} aria-label="Título de la tarea" required /><input name="description" defaultValue={task.description} aria-label="Descripción de la tarea" /><select name="projectId" defaultValue={task.projectId || ''} aria-label="Proyecto de la tarea"><option value="">Sin proyecto</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><select name="assigneeId" defaultValue={task.assigneeId || ''} aria-label="Persona asignada"><option value="">Sin asignar</option>{team.filter((member) => ['PROGRAMADOR', 'DISEÑADOR'].includes(member.role)).map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select><button type="submit">Guardar</button><button type="button" onClick={() => setEditingTask(null)}>Cancelar</button></form> : <article className="task-row" key={task.id}><button className={task.status === 'COMPLETED' ? 'task-check done' : task.status === 'PENDING_REVIEW' ? 'task-check review' : 'task-check'} type="button" onClick={() => handleToggleTask(task)} disabled={task.status === 'COMPLETED' && ['PROGRAMADOR', 'DISEÑADOR'].includes(user.role)} aria-label={user.role === 'LIDER' || user.role === 'ADMINISTRADOR' ? (task.status === 'PENDING_REVIEW' ? 'Aprobar tarea' : 'Enviar a revisión') : (task.status === 'PENDING_REVIEW' ? 'Volver a trabajar' : 'Enviar a revisión')}>{task.status === 'COMPLETED' ? '✓' : task.status === 'PENDING_REVIEW' ? '!' : ''}</button><span><strong>{task.title}</strong><small>{task.description || 'Sin descripción'}{task.assigneeId ? ` · ${team.find((member) => member.id === task.assigneeId)?.name || 'Persona asignada'}` : ''}</small></span><b>{task.status === 'COMPLETED' ? 'Aprobada' : task.status === 'PENDING_REVIEW' ? 'En revisión' : 'Pendiente'}</b><span className="row-actions">{activeView === 'Revisión' && <><button className="row-action approve-action" type="button" onClick={() => handleReviewDecision(task, 'COMPLETED')}>Aprobar</button><button className="row-action return-action" type="button" onClick={() => handleReviewDecision(task, 'IN_PROGRESS')}>Devolver</button></>}{activeView !== 'Revisión' && !['PROGRAMADOR', 'DISEÑADOR'].includes(user.role) && <button className="row-action" type="button" onClick={() => setEditingTask(task)} aria-label={`Editar ${task.title}`}>Editar</button>}{['ADMINISTRADOR', 'LIDER'].includes(user.role) && <button className="row-action danger visible-delete" type="button" onClick={() => handleDeleteTask(task.id)} aria-label={`Eliminar ${task.title}`}>Eliminar</button>}</span></article>)}</div>}
          </section>
        ) : <div className="dashboard-grid">
          <article className="metric-card accent-card"><span className="metric-label">Personas activas</span><strong>{team.filter((member) => member.isActive).length || '--'}</strong><p>Usuarios activos en tu espacio.</p></article>
          <article className="metric-card"><span className="metric-label">Proyectos en curso</span><strong>--</strong><p>Los proyectos aparecerán cuando exista su endpoint.</p></article>
          <article className="metric-card"><span className="metric-label">Tareas pendientes</span><strong>--</strong><p>Una lectura rápida del trabajo por hacer.</p></article>
        </div>}
        <section className="profile-card">
          <div><p className="eyebrow">Tu perfil</p><h2>{user.name}</h2><p>{user.email}</p></div>
          <dl><div><dt>Rol</dt><dd>{user.role}</dd></div><div><dt>Estado</dt><dd className="verified">Activo</dd></div></dl>
        </section>
      </section>
    </main>
  )
}

export default App

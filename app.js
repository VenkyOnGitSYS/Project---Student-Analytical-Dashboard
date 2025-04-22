const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const app = express();

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'student_skill_dashboard'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const userId = req.session.user.id;

    const skillQuery = `
        SELECT s.id, s.name 
        FROM skills s
        JOIN user_skills us ON us.skill_id = s.id
        WHERE us.user_id = ?
    `;

    const taskQuery = `
        SELECT st.id, st.title, st.description, st.difficulty 
        FROM skill_tasks st
        JOIN user_tasks ut ON ut.task_id = st.id
        WHERE ut.user_id = ?
        ORDER BY st.skill_id
    `;

    db.query(skillQuery, [userId], (err1, skillResults) => {
        if (err1) return res.status(500).send('Skill Fetch Error');

        db.query(taskQuery, [userId], (err2, taskResults) => {
            if (err2) return res.status(500).send('Task Fetch Error');

            res.render('index', {
                user: req.session.user,
                userSkills: skillResults,
                userTasks: taskResults
            });
        });
    });
});

app.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

app.get('/contact', (req, res) => {
    res.render('contact', { user: req.session.user || null });
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        res.render('login', { error: null });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) throw err;
        
        if (results.length === 0) {
            res.render('login', { error: 'Invalid email or password' });
        } else {
            const user = results[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                
                if (isMatch) {
                    req.session.user = {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        age: user.age,
                        qualification: user.qualification
                    };
                    res.redirect('/');
                } else {
                    res.render('login', { error: 'Invalid email or password' });
                }
            });
        }
    });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        res.redirect('/');
    } else {
        db.query('SELECT * FROM skills', (err, results) => {
            if (err) throw err;
            res.render('register', { skills: results, error: null });
        });
    }
});

app.post('/register', (req, res) => {
    const { username, email, password, confirmPassword, age, qualification, primarySkills, secondarySkills } = req.body;
    
    if (password !== confirmPassword) {
        db.query('SELECT * FROM skills', (err, skills) => {
            if (err) throw err;
            res.render('register', { skills, error: 'Passwords do not match' });
        });
        return;
    }
    
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) throw err;
        
        db.query('INSERT INTO users (username, email, password, age, qualification) VALUES (?, ?, ?, ?, ?)', 
            [username, email, hash, age, qualification], (err, result) => {
                if (err) {
                    db.query('SELECT * FROM skills', (err, skills) => {
                        if (err) throw err;
                        res.render('register', { skills, error: 'Email already exists' });
                    });
                    return;
                }
                
                const userId = result.insertId;
                
                if (primarySkills && primarySkills.length > 0) {
                    primarySkills.forEach(skillId => {
                        db.query('INSERT INTO user_skills (user_id, skill_id, priority) VALUES (?, ?, ?)', 
                            [userId, skillId, 'primary']);
                    });
                }
                
                if (secondarySkills && secondarySkills.length > 0) {
                    secondarySkills.forEach(skillId => {
                        db.query('INSERT INTO user_skills (user_id, skill_id, priority) VALUES (?, ?, ?)', 
                            [userId, skillId, 'secondary']);
                    });
                }
                
                req.session.user = {
                    id: userId,
                    username,
                    email,
                    age,
                    qualification
                };
                
                res.redirect('/');
            });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/skills', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }
    
    db.query(`
        SELECT s.*, us.priority 
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = ? AND us.priority = 'primary'
    `, [req.session.user.id], (err, primarySkills) => {
        if (err) throw err;
        
        db.query(`
            SELECT t.*, s.name as skill_name 
            FROM skill_tasks t
            JOIN skills s ON t.skill_id = s.id
            JOIN user_skills us ON us.skill_id = s.id
            WHERE us.user_id = ? AND us.priority = 'primary'
        `, [req.session.user.id], (err, tasks) => {
            if (err) throw err;
            
            db.query(`
                SELECT r.*, s.name as skill_name 
                FROM resources r
                JOIN skills s ON r.skill_id = s.id
                JOIN user_skills us ON us.skill_id = s.id
                WHERE us.user_id = ? AND us.priority = 'primary'
            `, [req.session.user.id], (err, resources) => {
                if (err) throw err;
                
                res.render('skills', { 
                    user: req.session.user,
                    primarySkills,
                    tasks,
                    resources
                });
            });
        });
    });
});

app.get('/additional-skills', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }
    
    db.query(`
        SELECT s.*, us.priority 
        FROM user_skills us
        JOIN skills s ON us.skill_id = s.id
        WHERE us.user_id = ? AND us.priority = 'secondary'
    `, [req.session.user.id], (err, secondarySkills) => {
        if (err) throw err;
        
        db.query(`
            SELECT t.*, s.name as skill_name 
            FROM skill_tasks t
            JOIN skills s ON t.skill_id = s.id
            JOIN user_skills us ON us.skill_id = s.id
            WHERE us.user_id = ? AND us.priority = 'secondary'
        `, [req.session.user.id], (err, tasks) => {
            if (err) throw err;
            
            db.query(`
                SELECT r.*, s.name as skill_name 
                FROM resources r
                JOIN skills s ON r.skill_id = s.id
                JOIN user_skills us ON us.skill_id = s.id
                WHERE us.user_id = ? AND us.priority = 'secondary'
            `, [req.session.user.id], (err, resources) => {
                if (err) throw err;
                
                res.render('additional-skills', { 
                    user: req.session.user,
                    secondarySkills,
                    tasks,
                    resources
                });
            });
        });
    });
});

app.post('/journal/add', (req, res) => {
    const userId = req.session.user.id;
    const content = req.body.content;

    if (!userId || !content) {
        return res.redirect('/journal');
    }

    const sql = "INSERT INTO journal_entries (user_id, content, created_at) VALUES (?, ?, NOW())";

    db.query(sql, [userId, content], (err, result) => {
        if (err) {
            console.error("Error inserting journal entry:", err);
            return res.status(500).send("Internal Server Error");
        }

        res.redirect('/journal');
    });
});

app.get('/journal', (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    db.query("SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC", 
        [req.session.user.id], (err, entries) => {
        if (err) throw err;

        res.render('journal', {
            user: req.session.user,
            entries
        });
    });
});


// In your route handler (app.js or routes file)
// Get reminders route
app.get('/reminders', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // Get active reminders (not completed)
    const activeQuery = `
        SELECT r.*, ut.id AS user_task_id, st.title AS task_title, s.name AS skill_name 
        FROM reminders r
        JOIN user_tasks ut ON r.task_id = ut.id
        JOIN skill_tasks st ON ut.task_id = st.id
        JOIN skills s ON st.skill_id = s.id
        WHERE r.user_id = ? AND r.completed = 0
        ORDER BY r.reminder_time ASC
    `;

    // Get completed reminders
    const completedQuery = `
        SELECT r.*, ut.id AS user_task_id, st.title AS task_title, s.name AS skill_name 
        FROM reminders r
        JOIN user_tasks ut ON r.task_id = ut.id
        JOIN skill_tasks st ON ut.task_id = st.id
        JOIN skills s ON st.skill_id = s.id
        WHERE r.user_id = ? AND r.completed = 1
        ORDER BY r.completed_at DESC
    `;

    // Get tasks for the reminder form
    const tasksQuery = `
        SELECT ut.id, st.title, s.name AS skill_name
        FROM user_tasks ut
        JOIN skill_tasks st ON ut.task_id = st.id
        JOIN skills s ON st.skill_id = s.id
        WHERE ut.user_id = ? AND ut.completed = 0
    `;

    Promise.all([
        db.promise().query(activeQuery, [req.session.user.id]),
        db.promise().query(completedQuery, [req.session.user.id]),
        db.promise().query(tasksQuery, [req.session.user.id])
    ])
    .then(([[activeReminders], [completedReminders], [tasks]]) => {
        res.render('reminders', {
            user: req.session.user,
            reminders: activeReminders,
            completedReminders: completedReminders || [],
            tasks: tasks
        });
    })
    .catch(err => {
        console.error('Database error:', err);
        res.status(500).send('Server error');
    });
});

app.post('/reminders', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    
    const { task_id, reminder_time, message } = req.body;
    
    if (!task_id || !reminder_time || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    db.query('SELECT id FROM user_tasks WHERE id = ? AND user_id = ?', 
        [task_id, req.session.user.id], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (results.length === 0) {
                return res.status(400).json({ error: 'Invalid task ID' });
            }

            db.query('INSERT INTO reminders (user_id, task_id, reminder_time, message) VALUES (?, ?, ?, ?)', 
                [req.session.user.id, task_id, reminder_time, message], (err) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Failed to create reminder' });
                    }
                    res.redirect('/reminders');
                });
        });
});

app.get('/resources', (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
        return;
    }

    db.query(`
        SELECT r.*, s.name as skill_name 
        FROM resources r
        JOIN skills s ON r.skill_id = s.id
        JOIN user_skills us ON us.skill_id = s.id
        WHERE us.user_id = ?
        ORDER BY s.name, r.level
    `, [req.session.user.id], (err, resources) => {
        if (err) throw err;

        res.render('resources', { 
            user: req.session.user,
            resources
        });
    });
});

app.get('/api/resources', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { skill, level, type } = req.query;
    let sql = `
        SELECT r.*, s.name AS skill_name 
        FROM resources r
        JOIN skills s ON r.skill_id = s.id
        JOIN user_skills us ON us.skill_id = s.id
        WHERE us.user_id = ?
    `;
    const params = [req.session.user.id];

    if (skill) {
        sql += ` AND s.name = ?`;
        params.push(skill);
    }

    if (level) {
        sql += ` AND r.level = ?`;
        params.push(level);
    }

    if (type) {
        sql += ` AND r.type = ?`;
        params.push(type);
    }

    sql += ` ORDER BY s.name, r.level`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching filtered resources:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(results); // 🔥 This is what the JS fetch() expects
    });
});

app.get('/api/tasks', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.query(`
        SELECT ut.id, ut.task_id, ut.due_date, ut.completed,
               t.title, t.description, t.difficulty,
               s.name AS skill_name
        FROM user_tasks ut
        JOIN skill_tasks t ON ut.task_id = t.id
        JOIN skills s ON t.skill_id = s.id
        WHERE ut.user_id = ?
        ORDER BY ut.due_date ASC
    `, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch tasks' });
        }
        res.json(results);
    });
});

app.post('/add-task', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { skillId, title, description, difficulty } = req.body;
    const userId = req.session.user.id;

    const insertSkillTask = `
        INSERT INTO skill_tasks (skill_id, title, description, difficulty)
        VALUES (?, ?, ?, ?)
    `;

    db.query(insertSkillTask, [skillId, title, description, difficulty], (err, result) => {
        if (err) {
            console.error("Error inserting into skill_tasks:", err);
            return res.status(500).json({ error: 'Failed to add skill task' });
        }

        const taskId = result.insertId;

        const insertUserTask = `
            INSERT INTO user_tasks (user_id, task_id)
            VALUES (?, ?)
        `;

        db.query(insertUserTask, [userId, taskId], (err2) => {
            if (err2) {
                console.error("Error inserting into user_tasks:", err2);
                return res.status(500).json({ error: 'Failed to link task to user' });
            }
            return res.redirect('/');
        });
    });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    const getUserSkillsQuery = `
        SELECT skills.id, skills.name
        FROM user_skills
        JOIN skills ON user_skills.skill_id = skills.id
        WHERE user_skills.user_id = ?
    `;

    db.query(getUserSkillsQuery, [userId], (err, skillRows) => {
        if (err) {
            console.error("Error fetching user skills:", err);
            return res.status(500).send("Server error");
        }

        res.render('index', {
            userSkills: skillRows
        });
    });
});


app.post('/api/tasks', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { task_id, due_date } = req.body;
    
    if (!task_id || !due_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.query(
        'INSERT INTO user_tasks (user_id, task_id, due_date) VALUES (?, ?, ?)',
        [req.session.user.id, task_id, due_date],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to create task' });
            }
            
            db.query(`
                SELECT ut.id, ut.task_id, ut.due_date, ut.completed,
                       t.title, t.description, t.difficulty,
                       s.name AS skill_name
                FROM user_tasks ut
                JOIN skill_tasks t ON ut.task_id = t.id
                JOIN skills s ON t.skill_id = s.id
                WHERE ut.id = ?
            `, [result.insertId], (err, task) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: 'Failed to fetch created task' });
                }
                res.status(201).json(task[0]);
            });
        }
    );
});

app.put('/api/tasks/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { completed } = req.body;
    
    db.query(
        'UPDATE user_tasks SET completed = ? WHERE id = ? AND user_id = ?',
        [completed, req.params.id, req.session.user.id],
        (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update task' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }
            res.json({ success: true });
        }
    );
});

app.put('/api/reminders/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    db.query('UPDATE reminders SET notified = ? WHERE id = ? AND user_id = ?', 
        [req.body.completed, req.params.id, req.session.user.id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to update reminder' });
            }
            res.json({ success: true });
        });
});

app.delete('/api/reminders/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    db.query('DELETE FROM reminders WHERE id = ? AND user_id = ?', 
        [req.params.id, req.session.user.id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to delete reminder' });
            }
            res.json({ success: true });
        });
});

app.post('/reminders/:id/complete', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = `
        UPDATE reminders 
        SET completed = 1, completed_at = NOW() 
        WHERE id = ? AND user_id = ?
    `;
    
    db.query(query, [req.params.id, req.session.user.id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update reminder' });
        }
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
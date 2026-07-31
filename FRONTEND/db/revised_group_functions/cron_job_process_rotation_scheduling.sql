SELECT cron.schedule(
    'daily-rotation-tasks',            
    '0 0 * * *',                        
    'SELECT groups.process_daily_rotation_tasks();'
);
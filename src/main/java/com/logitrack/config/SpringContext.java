package com.logitrack.config;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * Utilidad para acceder al ApplicationContext de Spring desde cualquier
 * lugar, incluso desde instancias creadas por Hibernate (como AuditEntityListener).
 */
@Component
public class SpringContext implements ApplicationContextAware {

    private static ApplicationContext context;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        SpringContext.context = applicationContext;
    }

    public static <T> T getBean(Class<T> beanClass) {
        if (context == null) {
            return null;
        }
        return context.getBean(beanClass);
    }

    public static ApplicationContext getContext() {
        return context;
    }
}

